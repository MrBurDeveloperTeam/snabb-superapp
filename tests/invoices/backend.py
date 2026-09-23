"""Controller contract checks without an Odoo database; pass invoices.py as argv[1]."""
import importlib.util
import sys
import types
import unittest
from unittest.mock import MagicMock

http = types.ModuleType('odoo.http')
http.Controller = object
http.route = lambda *a, **kw: lambda fn: fn
http.content_disposition = lambda name: 'attachment; filename="%s"' % name
http.request = MagicMock()
odoo = types.ModuleType('odoo')
odoo.http = http
sys.modules['odoo'] = odoo
sys.modules['odoo.http'] = http
package = types.ModuleType('invoice_test')
package.__path__ = []
sys.modules['invoice_test'] = package
checkout = types.ModuleType('invoice_test.checkout')
checkout.UnifiedShopCheckoutController = MagicMock()
sys.modules['invoice_test.checkout'] = checkout
spec = importlib.util.spec_from_file_location('invoice_test.invoices', sys.argv.pop(1))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class InvoiceAccessTests(unittest.TestCase):
    def setUp(self):
        self.controller = module.MyInvoicesController()
        self.controller._json = lambda body, status=200: (status, body)
        self.partner = types.SimpleNamespace(commercial_partner_id=types.SimpleNamespace(id=42))
        self.controller._partner = lambda: self.partner
        http.request.reset_mock()
        self.moves = http.request.env.__getitem__.return_value.sudo.return_value
        self.moves.reset_mock()
        self.moves.search.return_value = []
        self.moves.search_count.return_value = 41

    def test_guest_cannot_list_or_download(self):
        self.controller._partner = lambda: False
        self.assertEqual(self.controller.invoices()[0], 401)
        self.assertEqual(self.controller.invoice_pdf(1)[0], 401)
        http.request.env.__getitem__.assert_not_called()

    def test_list_uses_session_owner_and_excludes_private_document_types(self):
        status, data = self.controller.invoices(page='99', partner_id='999')
        self.assertEqual(status, 200)
        self.assertEqual(data['page'], 3)
        args, kwargs = self.moves.search.call_args
        self.assertEqual(args[0], [('commercial_partner_id', '=', 42), ('state', '=', 'posted'), ('move_type', 'in', ['out_invoice', 'out_refund'])])
        self.assertEqual(kwargs['offset'], 40)
        self.assertEqual(kwargs['limit'], 20)

    def test_foreign_pdf_returns_404_without_rendering(self):
        self.assertEqual(self.controller.invoice_pdf(900, partner_id='999')[0], 404)
        domain = self.moves.search.call_args.args[0]
        self.assertIn(('commercial_partner_id', '=', 42), domain)
        self.assertIn(('id', '=', 900), domain)
        http.request.env.__getitem__.assert_called_once_with('account.move')

    def test_bad_and_empty_pages_are_bounded(self):
        for value in ['bad', '-5', '0', None]:
            self.assertEqual(module.bounded_page(value, 0), 1)
        self.assertEqual(module.bounded_page('999', 21), 2)

if __name__ == '__main__':
    unittest.main()
