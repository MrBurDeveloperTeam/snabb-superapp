import api from '@/services/api';

export type AccessControlApp = 'appointment' | 'inventory';
export type EditableAccessRole = 'admin' | 'nurse' | 'dentist';
export type BackendPermissions = Record<string, boolean>;

export type AccessControlMatrixResponse = {
  ok: true;
  app: AccessControlApp;
  permissions: string[];
  roles: Record<'manager' | EditableAccessRole, BackendPermissions>;
};

export async function getCompanyAccessMatrix(
  app: AccessControlApp,
): Promise<AccessControlMatrixResponse> {
  const response = await api.get('/company/access-control', {
    params: { app },
  });

  if (!response.data?.ok) {
    throw new Error(
      response.data?.error || 'Unable to load access control.',
    );
  }

  return response.data as AccessControlMatrixResponse;
}

export async function saveCompanyRolePermissions(
  app: AccessControlApp,
  role: EditableAccessRole,
  permissions: BackendPermissions,
) {
  const response = await api.put(
    '/company/access-control',
    { role, permissions },
    { params: { app } },
  );

  if (!response.data?.ok) {
    throw new Error(
      response.data?.error || 'Unable to save access control.',
    );
  }

  return response.data;
}
