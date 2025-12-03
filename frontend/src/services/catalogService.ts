import * as api from './apiService';
import { Company, Supervisor, EndUser } from '../types/api';

// Companies
export const getCompanies = () => api.get<Company[]>('/companies');
export const getCompanyById = (id: number) => api.get<Company>(`/companies/${id}`);
export const searchCompanies = (query: string) => api.get<Company[]>(`/companies/search?q=${query}`);
export const createCompany = (data: Partial<Company>) => api.post<Company>('/companies', data);
export const updateCompany = (id: number, data: Partial<Company>) => api.put<Company>(`/companies/${id}`, data);
export const deleteCompany = (id: number) => api.del(`/companies/${id}`);

// Supervisors
export const getSupervisors = () => api.get<Supervisor[]>('/supervisors');
export const getSupervisorById = (id: number) => api.get<Supervisor>(`/supervisors/${id}`);
export const searchSupervisors = (query: string) => api.get<Supervisor[]>(`/supervisors/search?q=${query}`);
export const createSupervisor = (data: Partial<Supervisor>) => api.post<Supervisor>('/supervisors', data);
export const updateSupervisor = (id: number, data: Partial<Supervisor>) => api.put<Supervisor>(`/supervisors/${id}`, data);
export const deleteSupervisor = (id: number) => api.del(`/supervisors/${id}`);

// End Users
export const getEndUsers = () => api.get<EndUser[]>('/end-users');
export const getEndUserById = (id: number) => api.get<EndUser>(`/end-users/${id}`);
export const getEndUsersByCompany = (companyId: number) => api.get<EndUser[]>(`/end-users/by-company/${companyId}`);
export const searchEndUsers = (query: string) => api.get<EndUser[]>(`/end-users/search?q=${query}`);
export const createEndUser = (data: Partial<EndUser>) => api.post<EndUser>('/end-users', data);
export const updateEndUser = (id: number, data: Partial<EndUser>) => api.put<EndUser>(`/end-users/${id}`, data);
export const deleteEndUser = (id: number) => api.del(`/end-users/${id}`);
