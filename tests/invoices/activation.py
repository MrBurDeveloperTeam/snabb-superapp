"""Exercise the receipt/activation boundary without sending mail or updating an Odoo database."""
import importlib.util
from pathlib import Path
import sys
import types
import unittest
from unittest.mock import MagicMock


root = Path(sys.argv.pop(1))
odoo = types.ModuleType("odoo")
odoo.http = types.ModuleType("odoo.http")
odoo.http.Controller = object
odoo.http.route = lambda *args, **kwargs: lambda fn: fn
odoo.http.request = MagicMock()
class MailModel:
    def _prepare_outgoing_list(self, *args, **kwargs):
        return self.outgoing


odoo.models = types.SimpleNamespace(Model=MailModel)
odoo.tools = types.SimpleNamespace(email_normalize=lambda value: value.lower())
sys.modules.update({
    "odoo": odoo, "odoo.http": odoo.http,
    "odoo.exceptions": types.SimpleNamespace(UserError=ValueError),
    "markupsafe": types.SimpleNamespace(Markup=str),
})


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, root / path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


parcel = load("parcel_move", "mrbur_parcel_tracking/models/account_move.py")
Move = parcel.AccountMove
Controller = load("password_reset", "mrbur_password_reset/controllers/main.py").PasswordResetController


class InvoiceActivationTests(unittest.TestCase):
    def setUp(self):
        self.invoice = MagicMock()
        self.user = MagicMock(login="buyer@example.test")
        self.invoice._snabbb_activation_user.return_value = self.user
        self.invoice._snabbb_invoice_url.side_effect = lambda token=None: token or "preview"
        self.user.partner_id._generate_signup_token.return_value = "signup-token"
        self.models = {name: MagicMock() for name in ["res.users", "res.partner", "account.move"]}
        odoo.http.request.env = self.models
        self.partner_lookup = self.models["res.partner"].sudo()._signup_retrieve_partner
        self.partner_lookup.return_value.user_ids.__getitem__.return_value = self.user
        self.models["account.move"].sudo().browse().exists.return_value = self.invoice
        self.signup = self.models["res.users"].sudo().signup

    def test_activation_link_only_for_single_buyer_mailbox(self):
        for addresses in [[], ["someone@example.test"], [self.user.login, "cc@example.test"]]:
            self.assertEqual(Move._snabbb_link_for_recipient(self.invoice, addresses), "preview")
        self.user.partner_id._generate_signup_token.assert_not_called()
        self.assertEqual(Move._snabbb_link_for_recipient(self.invoice, [self.user.login]), "signup-token")

    def test_unrelated_invoice_and_already_activated_account_cannot_change_password(self):
        for ineligible in [False, MagicMock()]:
            self.invoice._snabbb_activation_user.return_value = ineligible
            result = Controller().reset_password_confirm("valid", "new-password", invoice_id=5)
            self.assertFalse(result["ok"])
        self.signup.assert_not_called()

    def test_invalid_token_cannot_activate(self):
        self.partner_lookup.side_effect = ValueError("expired")
        result = Controller().reset_password_confirm("invalid", "new-password", invoice_id=5)
        self.assertFalse(result["ok"])
        self.signup.assert_not_called()

    def test_fresh_email_is_sent_to_the_matching_login_for_the_requested_invoice(self):
        controller = Controller()
        send = self.invoice._x_send_account_activation_email
        for login in ["other@example.test", self.user.login]:
            self.assertEqual(controller.reset_password_request(login, invoice_id=5), {"ok": True})
        send.assert_called_once_with(self.invoice.partner_id, self.user.login)
        self.models["res.users"].sudo().reset_password.assert_not_called()

    def test_confirmation_uses_odoo_signup_and_returns_verified_login(self):
        result = Controller().reset_password_confirm("valid", "new-password", invoice_id=5)
        self.signup.assert_called_once_with({"login": self.user.login, "password": "new-password"}, token="valid")
        self.assertEqual(result, {"ok": True, "login": self.user.login})

    def test_issued_pdf_receipt_personalizes_only_the_buyers_copy(self):
        odoo.tools.mail = types.SimpleNamespace(
            email_normalize_all=lambda email: [email],
            append_content_to_html=lambda body, link, plaintext: body + link,
        )
        odoo.tools.html2plaintext = str
        mail = parcel.MailMail()
        mail.env = self.models
        mail.model, mail.res_id = "account.move", 42
        invoice = self.invoice
        invoice.move_type, invoice.state = "out_invoice", "posted"
        invoice.partner_id.email = self.user.login
        invoice.invoice_pdf_report_id.checksum = "issued-pdf-checksum"
        mail.attachment_ids = MagicMock()
        checksums = mail.attachment_ids.sudo().mapped
        checksums.return_value = ["other-document"]
        invoice._snabbb_link_for_recipient.side_effect = lambda addresses: Move._snabbb_link_for_recipient(invoice, addresses)
        def message(to, cc):
            return {"email_to": [to], "email_cc": cc, "email_to_normalized": [to, *cc], "body": "Receipt"}
        mail.outgoing = [
            message(self.user.login, []),
            message(self.user.login, ["billing@example.test"]),
            message("another@example.test", []),
        ]
        self.assertTrue(all(m["body"] == "Receipt" for m in mail._prepare_outgoing_list()))
        checksums.return_value = [invoice.invoice_pdf_report_id.checksum]
        buyer, copied, other = mail._prepare_outgoing_list()
        self.assertIn('href="signup-token"', buyer["body"])
        self.assertIn('href="preview"', copied["body"])
        self.assertNotIn("signup-token", copied["body_alternative"])
        self.assertEqual(other["body"], "Receipt")


if __name__ == "__main__":
    unittest.main()
