import React, { useEffect, useMemo, useState } from 'react';
import { Check, Save, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import {
  getCompanyAccessMatrix,
  saveCompanyRolePermissions,
} from '../services/companyAccessControlService';

type AppKey = 'inventory' | 'appointment';
type EditableRole = 'admin' | 'nurse' | 'dentist';

type PermissionDefinition = {
  key: string;
  label: string;
  description: string;
};

type PermissionState = Record<AppKey, Record<EditableRole, Record<string, boolean>>>;

const ROLES: Array<{
  key: 'manager' | EditableRole;
  label: string;
  badgeClass: string;
}> = [
  { key: 'manager', label: 'Manager', badgeClass: 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-400/30 dark:bg-blue-500/15 dark:text-blue-300' },
  { key: 'admin', label: 'Admin', badgeClass: 'border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-400/30 dark:bg-violet-500/15 dark:text-violet-300' },
  { key: 'nurse', label: 'Nurse', badgeClass: 'border-pink-300 bg-pink-50 text-pink-700 dark:border-pink-400/30 dark:bg-pink-500/15 dark:text-pink-300' },
  { key: 'dentist', label: 'Dentist', badgeClass: 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-300' },
];

const PERMISSIONS: Record<AppKey, PermissionDefinition[]> = {
  inventory: [
    { key: 'access', label: 'Access Inventory', description: 'Open the Inventory mini app, view All Inventory, stock quantities, and item details' },
    { key: 'clinic', label: 'Manage Clinic Setup', description: 'Unlock editing and use Add, Delete, and Open Floor in the Interactive Clinic' },
    { key: 'items', label: 'Manage Items', description: 'Add, edit, archive, or delete inventory items' },
    { key: 'stock', label: 'Manage Stock', description: 'Access Receive Stock, record purchases, adjust quantities, and view Purchase History' },
    { key: 'insights', label: 'View Insights & Alerts', description: 'Access Usage Stats, Expiring Items, low-stock alerts, and expiry warnings' },
    { key: 'export', label: 'Export Inventory Data', description: 'Use the download/export button' },
  ],
  appointment: [
    { key: 'access', label: 'Access Appointment Schedule', description: 'View calendars and daily appointments — Calendar and Today tabs' },
    { key: 'manage', label: 'Manage Appointments', description: 'Create, edit, cancel, and send appointment reminders — New Appointment button and appointment actions' },
    { key: 'patients', label: 'Access Patient Records', description: 'View and manage patients connected to appointments — Patients tab and patient details' },
    { key: 'requests', label: 'Manage Booking Requests', description: 'Review, approve, reschedule, or reject incoming booking requests — Requests tab' },
    { key: 'reports', label: 'View Reports & Activity', description: 'View appointment performance reports and activity history — Reports and Activity tabs' },
    { key: 'settings', label: 'Manage Appointment Settings', description: 'Configure staff, rooms, treatments, holidays, and schedules — Settings tab and booking-link configuration' },
  ],
};

const INITIAL_PERMISSIONS: PermissionState = {
  inventory: {
    admin: { access: true, clinic: true, items: true, stock: true, insights: true, export: true },
    nurse: { access: true, clinic: false, items: true, stock: true, insights: true, export: false },
    dentist: { access: true, clinic: false, items: false, stock: false, insights: true, export: false },
  },
  appointment: {
    admin: { access: true, manage: true, patients: true, requests: true, reports: false, settings: false },
    nurse: { access: true, manage: true, patients: true, requests: true, reports: false, settings: false },
    dentist: { access: true, manage: false, patients: true, requests: false, reports: false, settings: false },
  },
};

const APP_META: Record<AppKey, { label: string; iconPath: string }> = {
  inventory: {
    label: 'Inventory',
    iconPath: '/icons/inventory_tiffany.png',
  },
  appointment: {
    label: 'Appointment',
    iconPath: '/icons/appointment.png',
  },
};

const APPOINTMENT_BACKEND_KEYS: Record<string, string> = {
  access: 'appointment.schedule.access',
  manage: 'appointment.manage',
  patients: 'appointment.patients.access',
  requests: 'appointment.requests.manage',
  reports: 'appointment.reports.view',
  settings: 'appointment.settings.manage',
};

const INVENTORY_BACKEND_KEYS: Record<string, string> = {
  access: 'inventory.access',
  clinic: 'inventory.clinic.manage',
  items: 'inventory.items.manage',
  stock: 'inventory.stock.manage',
  insights: 'inventory.insights.view',
  export: 'inventory.export',
};

const BACKEND_KEYS: Record<AppKey, Record<string, string>> = {
  inventory: INVENTORY_BACKEND_KEYS,
  appointment: APPOINTMENT_BACKEND_KEYS,
};

function PermissionSwitch({
  checked,
  disabled = false,
  locked = false,
  label,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  locked?: boolean;
  label: string;
  onChange?: () => void;
}) {
  if (locked) {
    return (
      <span className="inline-grid h-7 w-7 place-items-center rounded-full bg-teal-100 text-teal-600 dark:bg-teal-500/20 dark:text-teal-300" aria-label={label}>
        <Check size={15} strokeWidth={2.5} aria-hidden="true" />
      </span>
    );
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      disabled={disabled}
      className={`relative h-7 w-12 cursor-pointer rounded-full transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500 ${
        checked
          ? 'bg-teal-500 hover:bg-teal-600'
          : 'bg-slate-300 hover:bg-slate-400 dark:bg-slate-600'
      }`}
    >
      <span
        aria-hidden="true"
        className={`absolute left-0 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

export default function AccessControlPanel() {
  const [activeApp, setActiveApp] = useState<AppKey>('inventory');
  const [permissions, setPermissions] = useState<PermissionState>(INITIAL_PERMISSIONS);
  const [loadedApps, setLoadedApps] = useState<Record<AppKey, boolean>>({
    inventory: false,
    appointment: false,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const definitions = PERMISSIONS[activeApp];
  const app = APP_META[activeApp];

  useEffect(() => {
    if (loadedApps[activeApp]) return;

    let cancelled = false;

    const loadPermissions = async () => {
      setLoading(true);

      try {
        const result = await getCompanyAccessMatrix(activeApp);
        if (cancelled) return;

        const appPermissions = (['admin', 'nurse', 'dentist'] as EditableRole[])
          .reduce<Record<EditableRole, Record<string, boolean>>>((next, role) => {
            next[role] = Object.fromEntries(
              PERMISSIONS[activeApp].map(({ key }) => [
                key,
                result.roles?.[role]?.[BACKEND_KEYS[activeApp][key]] === true,
              ]),
            );
            return next;
          }, { admin: {}, nurse: {}, dentist: {} });

        setPermissions((current) => ({
          ...current,
          [activeApp]: appPermissions,
        }));
        setLoadedApps((current) => ({
          ...current,
          [activeApp]: true,
        }));
      } catch (error: any) {
        toast.error(
          error?.response?.data?.error ||
          error?.message ||
          `Unable to load ${APP_META[activeApp].label} permissions.`,
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadPermissions();

    return () => {
      cancelled = true;
    };
  }, [activeApp, loadedApps]);

  const allEnabled = useMemo(() => {
    return (['admin', 'nurse', 'dentist'] as EditableRole[]).reduce<Record<EditableRole, boolean>>(
      (result, role) => {
        result[role] = definitions.every((permission) => permissions[activeApp][role][permission.key]);
        return result;
      },
      { admin: false, nurse: false, dentist: false },
    );
  }, [activeApp, definitions, permissions]);

  const togglePermission = (role: EditableRole, permissionKey: string) => {
    setPermissions((current) => {
      const rolePermissions = { ...current[activeApp][role] };
      const nextValue = !rolePermissions[permissionKey];
      rolePermissions[permissionKey] = nextValue;

      if (permissionKey === 'access' && !nextValue) {
        definitions.forEach((permission) => {
          rolePermissions[permission.key] = false;
        });
      } else if (permissionKey !== 'access' && nextValue) {
        rolePermissions.access = true;
      }

      return {
        ...current,
        [activeApp]: {
          ...current[activeApp],
          [role]: rolePermissions,
        },
      };
    });
  };

  const toggleAll = (role: EditableRole) => {
    const nextValue = !allEnabled[role];
    setPermissions((current) => ({
      ...current,
      [activeApp]: {
        ...current[activeApp],
        [role]: Object.fromEntries(definitions.map((permission) => [permission.key, nextValue])),
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      await Promise.all(
        (['admin', 'nurse', 'dentist'] as EditableRole[]).map((role) => {
          const backendPermissions = Object.fromEntries(
            PERMISSIONS[activeApp].map(({ key }) => [
              BACKEND_KEYS[activeApp][key],
              permissions[activeApp][role][key] === true,
            ]),
          );

          return saveCompanyRolePermissions(
            activeApp,
            role,
            backendPermissions,
          );
        }),
      );

      toast.success(`${APP_META[activeApp].label} permissions saved.`);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.error ||
        error?.message ||
        `Unable to save ${APP_META[activeApp].label} permissions.`,
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-8 grid items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-5 text-xs font-black uppercase tracking-[0.14em] text-slate-400 dark:border-slate-700 dark:bg-slate-800/60">
          Productivity
        </div>
        {(Object.keys(APP_META) as AppKey[]).map((appKey) => {
          const item = APP_META[appKey];
          const active = activeApp === appKey;
          return (
            <button
              key={appKey}
              type="button"
              aria-pressed={active}
              onClick={() => setActiveApp(appKey)}
              className={`relative flex w-full cursor-pointer items-center gap-4 px-5 py-5 text-left font-bold transition-colors focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-teal-500 ${active ? 'bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300' : 'text-slate-800 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800'}`}
            >
              <img src={item.iconPath} alt="" className="h-10 w-10 shrink-0 rounded-xl object-cover" />
              <span>{item.label}</span>
              {active && <span className="absolute right-4 h-7 w-1 rounded-full bg-teal-500" aria-hidden="true" />}
            </button>
          );
        })}
      </aside>

      <section className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900" aria-labelledby={`${activeApp}-permissions-title`}>
        <div className="flex items-center gap-4 border-b border-slate-200 px-7 py-5 dark:border-slate-700">
          <img src={app.iconPath} alt="" className="h-12 w-12 shrink-0 rounded-2xl object-cover" />
          <div>
            <h2 id={`${activeApp}-permissions-title`} className="text-lg font-black text-slate-900 dark:text-white">{app.label} Permissions</h2>
            <p className="text-sm text-slate-400">Configure what each role can do in this mini app</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[780px]">
            <div className="grid grid-cols-[minmax(280px,1.7fr)_repeat(4,minmax(105px,0.65fr))] items-center border-b border-slate-200 bg-slate-50/70 px-7 py-4 dark:border-slate-700 dark:bg-slate-800/60">
              <span className="text-sm font-bold text-slate-400">Function</span>
              {ROLES.map((role) => (
                <div key={role.key} className="flex min-h-[54px] flex-col items-center justify-center gap-2 text-center">
                  <span className={`rounded-full border px-3 py-1 text-sm font-bold ${role.badgeClass}`}>{role.label}</span>
                  {role.key !== 'manager' && (
                    <button type="button" disabled={loading || saving} onClick={() => toggleAll(role.key as EditableRole)} className="cursor-pointer text-xs font-medium text-teal-600 hover:text-teal-700 hover:underline disabled:cursor-not-allowed disabled:opacity-60 focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500 dark:text-teal-300">
                      {allEnabled[role.key as EditableRole] ? 'Deselect all' : 'Select all'}
                    </button>
                  )}
                </div>
              ))}
            </div>

            {definitions.map((permission) => (
              <div key={permission.key} className="grid grid-cols-[minmax(280px,1.7fr)_repeat(4,minmax(105px,0.65fr))] items-center border-b border-slate-200 px-7 py-5 last:border-b-0 dark:border-slate-700">
                <div className="pr-6">
                  <h3 className="font-bold text-slate-900 dark:text-slate-100">{permission.label}</h3>
                  <p className="mt-1 max-w-sm text-sm leading-6 text-slate-400">{permission.description}</p>
                </div>
                <div className="grid place-items-center"><PermissionSwitch checked locked label={`Manager has ${permission.label}`} /></div>
                {(['admin', 'nurse', 'dentist'] as EditableRole[]).map((role) => (
                  <div key={role} className="grid place-items-center">
                    <PermissionSwitch
                      checked={permissions[activeApp][role][permission.key]}
                      disabled={loading || saving}
                      label={`${role} ${permission.label}`}
                      onChange={() => togglePermission(role, permission.key)}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <footer className="flex flex-col gap-4 border-t border-slate-200 px-7 py-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700">
          <p className="flex items-start gap-2 text-sm text-slate-400">
            <ShieldCheck className="mt-0.5 shrink-0 text-blue-500" size={17} aria-hidden="true" />
            <span><strong className="font-bold text-blue-600 dark:text-blue-300">Manager</strong> always has full access and cannot be restricted.</span>
          </p>
          <button type="button" onClick={handleSave} disabled={loading || saving} className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-teal-500 px-6 py-3 font-bold text-white shadow-sm transition hover:bg-teal-600 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500">
            <Save size={18} aria-hidden="true" />
            {loading ? 'Loading…' : saving ? 'Saving…' : 'Save Changes'}
          </button>
        </footer>
      </section>
    </div>
  );
}
