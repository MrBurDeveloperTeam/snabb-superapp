import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { fetchCountries, fetchStates } from '../../api/checkoutApi';
import type { AddressFormValues, CheckoutAddress, CheckoutCountry } from '../../types';

interface AddressFormModalProps {
  title: string;
  initial: CheckoutAddress | null;
  saving: boolean;
  error: string | null;
  onCancel: () => void;
  onSave: (values: AddressFormValues) => void;
}

function emptyValues(initial: CheckoutAddress | null): AddressFormValues {
  return {
    id: initial?.id,
    name: initial?.name ?? '',
    street: initial?.street ?? '',
    street2: initial?.street2 ?? '',
    city: initial?.city ?? '',
    zip: initial?.zip ?? '',
    state_id: initial?.state_id ?? false,
    country_id: initial?.country_id ?? false,
    phone: initial?.phone ?? '',
    email: initial?.email ?? '',
  };
}

/**
 * Add/edit address form — fields mirror what checkout.py's POST
 * /api/unified-shop/checkout/address actually reads (name, street,
 * street2, city, zip, state_id, country_id, phone, email). Country list
 * and the selected country's states are fetched lazily from
 * /api/unified-shop/checkout/countries and /states rather than bundled
 * into every /checkout/state response — that response is refetched after
 * nearly every action on this page, and a ~250-row country list doesn't
 * need to ride along on each of those.
 */
const AddressFormModal: React.FC<AddressFormModalProps> = ({
  title,
  initial,
  saving,
  error,
  onCancel,
  onSave,
}) => {
  const [values, setValues] = useState<AddressFormValues>(() => emptyValues(initial));
  const [countries, setCountries] = useState<CheckoutCountry[]>([]);
  const [states, setStates] = useState<{ id: number; name: string }[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchCountries()
      .then((res) => {
        if (!cancelled) setCountries(res.countries ?? []);
      })
      .catch(() => {
        // Country list failing to load shouldn't block the rest of the
        // form — the country <select> just renders empty and the field
        // stays required, so Save will (correctly) refuse to submit.
      })
      .finally(() => {
        if (!cancelled) setLoadingCountries(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!values.country_id) {
      setStates([]);
      return;
    }
    let cancelled = false;
    fetchStates(values.country_id)
      .then((res) => {
        if (!cancelled) setStates(res.states ?? []);
      })
      .catch(() => {
        if (!cancelled) setStates([]);
      });
    return () => {
      cancelled = true;
    };
  }, [values.country_id]);

  const canSubmit =
    values.street.trim().length > 0 &&
    values.city.trim().length > 0 &&
    !!values.country_id &&
    !saving;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSave(values);
  };

  const inputClass =
    'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-800 outline-none focus:border-tiffany-500 focus:ring-1 focus:ring-tiffany-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';
  const labelClass = 'mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400';

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[1px]"
      onClick={onCancel}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">{title}</h3>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className={labelClass} htmlFor="addr-name">Full name</label>
            <input
              id="addr-name"
              className={inputClass}
              value={values.name}
              onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
              placeholder="Full name"
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="addr-street">Address</label>
            <input
              id="addr-street"
              className={inputClass}
              value={values.street}
              onChange={(e) => setValues((v) => ({ ...v, street: e.target.value }))}
              placeholder="Street address"
              required
            />
          </div>

          <div>
            <input
              className={inputClass}
              value={values.street2}
              onChange={(e) => setValues((v) => ({ ...v, street2: e.target.value }))}
              placeholder="Apartment, suite, etc. (optional)"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="addr-city">City</label>
              <input
                id="addr-city"
                className={inputClass}
                value={values.city}
                onChange={(e) => setValues((v) => ({ ...v, city: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="addr-zip">Postcode</label>
              <input
                id="addr-zip"
                className={inputClass}
                value={values.zip}
                onChange={(e) => setValues((v) => ({ ...v, zip: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="addr-country">Country</label>
              <select
                id="addr-country"
                className={inputClass}
                value={values.country_id ? String(values.country_id) : ''}
                onChange={(e) =>
                  setValues((v) => ({
                    ...v,
                    country_id: e.target.value ? Number(e.target.value) : false,
                    state_id: false,
                  }))
                }
                required
                disabled={loadingCountries}
              >
                <option value="">{loadingCountries ? 'Loading…' : 'Select country'}</option>
                {countries.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="addr-state">State / Province</label>
              <select
                id="addr-state"
                className={inputClass}
                value={values.state_id ? String(values.state_id) : ''}
                onChange={(e) =>
                  setValues((v) => ({
                    ...v,
                    state_id: e.target.value ? Number(e.target.value) : false,
                  }))
                }
                disabled={!values.country_id || states.length === 0}
              >
                <option value="">{states.length === 0 ? 'N/A' : 'Select state'}</option>
                {states.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="addr-phone">Phone</label>
              <input
                id="addr-phone"
                className={inputClass}
                value={values.phone}
                onChange={(e) => setValues((v) => ({ ...v, phone: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="addr-email">Email</label>
              <input
                id="addr-email"
                type="email"
                className={inputClass}
                value={values.email}
                onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
              />
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-[12px] font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </p>
          )}

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg px-4 py-2 text-[13px] font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-lg bg-tiffany-500 px-4 py-2 text-[13px] font-bold text-white hover:bg-tiffany-600 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save address'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddressFormModal;
