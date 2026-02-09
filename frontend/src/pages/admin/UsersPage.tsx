import React from 'react';
import { useLoaderData } from 'react-router-dom';
import { User } from '../../types/api';

interface LoaderData {
  users?: User[];
}

const UsersPage: React.FC = () => {
  const { users = [] } = useLoaderData() as LoaderData;

  return (
    <div className="space-y-6" data-tour="admin-users-list">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold text-dark-blue">Usuarios del Sistema</h1>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200">
          <p className="text-sm text-neutral-gray">{users.length} usuarios encontrados</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50 text-left text-xs uppercase text-neutral-gray">
                <th className="px-5 py-3">Nombre</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Rol</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t border-gray-100 text-sm">
                  <td className="px-5 py-3">{user.first_name} {user.last_name}</td>
                  <td className="px-5 py-3">{user.email}</td>
                  <td className="px-5 py-3 capitalize">{user.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UsersPage;
