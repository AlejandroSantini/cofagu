import { api } from './axios';
import { 
  type ApiResponse, 
  type User, 
  type Carrier,
  type Driver,
  type Truck,
  type Load,
  type CreateCarrierPayload,
  type CreateDriverPayload,
  type CreateTruckPayload,
  type CreateLoadPayload,
  type AssignLoadResponse,
  type CarrierDocument,
  type CarrierGroup,
  type Application,
  type Invoice
} from '../types';




// --- AUTH & USERS ---
export const authService = {
  login: (email: string, password: string) => 
    api.post<ApiResponse<{ user: User; token: string }>>('/users/login', { email, password }),
  
  getMe: () => api.get<ApiResponse<User>>('/users/me'),

  getUsers: () => api.get<ApiResponse<User[]>>('/users'),
  
  register: (data: unknown) => api.post<ApiResponse<User>>('/users/register', data),

  updateUser: (id: number, data: Partial<User>) => 
    api.patch<ApiResponse<User>>(`/users/${id}`, data),

  deleteUser: (id: number) => 
    api.delete<ApiResponse<void>>(`/users/${id}`),

  changePassword: (newPassword: string) => 
    api.post<ApiResponse<void>>('/users/change-password', { newPassword }),

  forgotPassword: (email: string) =>
    api.post<ApiResponse<void>>('/users/forgot-password', { email }),

  resetPassword: (token: string, newPassword: string) =>
    api.post<ApiResponse<void>>('/users/reset-password', { token, newPassword }),
};

// --- CARRIERS ---
export const carrierService = {
  getCarriers: () =>
    api.get<ApiResponse<Carrier[]>>('/carriers'),
  getCarrier: (id: number) =>
    api.get<ApiResponse<Carrier>>(`/carriers/${id}`),
  createCarrier: (data: CreateCarrierPayload) =>
    api.post<ApiResponse<Carrier>>('/carriers', data),
  updateCarrier: (id: number, data: Partial<CreateCarrierPayload>) =>
    api.put<ApiResponse<Carrier>>(`/carriers/${id}`, data),
  deleteCarrier: (id: number) =>
    api.delete<ApiResponse<void>>(`/carriers/${id}`),
  getCarrierHistory: (id: number) =>
    api.get<ApiResponse<Application[]>>(`/carriers/${id}/history`),
};


// --- DRIVERS ---
export const driverService = {
  getDrivers: (params?: { carrierId?: number }) =>
    api.get<ApiResponse<Driver[]>>('/drivers', { params }),
  getDriver: (id: number) =>
    api.get<ApiResponse<Driver>>(`/drivers/${id}`),
  createDriver: (data: CreateDriverPayload) =>
    api.post<ApiResponse<Driver>>('/drivers', data),
  updateDriver: (id: number, data: Partial<CreateDriverPayload>) =>
    api.put<ApiResponse<Driver>>(`/drivers/${id}`, data),
  deleteDriver: (id: number) =>
    api.delete<ApiResponse<void>>(`/drivers/${id}`),
};

// --- TRUCKS ---
export const truckService = {
  getTrucks: (params?: { carrierId?: number }) =>
    api.get<ApiResponse<Truck[]>>('/trucks', { params }),
  getTruck: (id: number) =>
    api.get<ApiResponse<Truck>>(`/trucks/${id}`),
  createTruck: (data: CreateTruckPayload) =>
    api.post<ApiResponse<Truck>>('/trucks', data),
  updateTruck: (id: number, data: Partial<CreateTruckPayload>) =>
    api.put<ApiResponse<Truck>>(`/trucks/${id}`, data),
  deleteTruck: (id: number) =>
    api.delete<ApiResponse<void>>(`/trucks/${id}`),
};

// --- LOADS & APPLICATIONS ---
export const loadService = {
  getLoads: (params?: { status?: string; carrierId?: number }) =>
    api.get<ApiResponse<Load[]>>('/loads', { params }),
  getLoad: (id: number) =>
    api.get<ApiResponse<Load>>(`/loads/${id}`),
  createLoad: (data: CreateLoadPayload) =>
    api.post<ApiResponse<Load>>('/loads', data),
  updateLoad: (id: number, data: Partial<CreateLoadPayload> & { differenceAdjusted?: boolean }) =>
    api.put<ApiResponse<Load>>(`/loads/${id}`, data),
  deleteLoad: (id: number) =>
    api.delete<ApiResponse<void>>(`/loads/${id}`),
  patchLoadStatus: (id: number, status: string) =>
    api.patch<ApiResponse<void>>(`/loads/${id}/status`, { status }),
  confirmDeparture: (id: number, data: { ctg: string; loadedWeight: number }) =>
    api.post<ApiResponse<void>>(`/loads/${id}/confirm-departure`, data),
  confirmDepartureByApp: (appId: number, data: { ctg: string; loadedWeight: number }) =>
    api.post<ApiResponse<Application>>(`/loads/applications/${appId}/confirm-departure`, data),
  applyToLoad: (id: number, data: { carrierId: number; notes?: string; driverId: number; truckId: number }) =>
    api.post<ApiResponse<void>>(`/loads/${id}/apply`, data),
  assignLoad: (id: number, data: { applicationId: number; driverId: number; truckId: number }) =>
    api.post<ApiResponse<AssignLoadResponse>>(`/loads/${id}/assign`, data),
  assignResources: (id: number, data: { driverId: number; truckId: number }) =>
    api.patch<ApiResponse<void>>(`/loads/${id}/resources`, data),
  reportContingency: (id: number, data: { description: string; reportedBy: string }) =>
    api.post<ApiResponse<void>>(`/loads/${id}/contingencies`, data),
  postCompletionData: (id: number, data: unknown) =>
    api.post<ApiResponse<void>>(`/loads/${id}/completion-data`, data),
  postCompletionDataByApp: (appId: number, data: { unloadedWeight: number; waybillUrl?: string; fuelConsumption?: number; mileage?: number }) =>
    api.post<ApiResponse<Application>>(`/loads/applications/${appId}/complete-data`, data),
  reportNoShow: (id: number, payload?: { applicationId?: number }) =>
    api.post<ApiResponse<void>>(`/loads/${id}/no-show`, payload || {}),
  cancelApplication: (appId: number, reason: string) =>
    api.post<ApiResponse<void>>(`/loads/applications/${appId}/cancel`, { reason }),
  getCancelledApplications: () =>
    api.get<ApiResponse<Application[]>>('/loads/applications/cancelled'),
};




// --- CARRIER DOCUMENTS ---
export const carrierDocumentService = {
  getDocuments: (params?: { carrierId?: number }) =>
    api.get<ApiResponse<CarrierDocument[]>>('/carrier-documents', { params }),
  getDocument: (id: number) =>
    api.get<ApiResponse<CarrierDocument>>(`/carrier-documents/${id}`),
  createDocument: (data: { type: 'SEGURO_CARGA'; fileUrl: string; expirationDate: string; carrierId?: number; status?: 'PENDING' | 'APPROVED' | 'REJECTED' }) =>
    api.post<ApiResponse<CarrierDocument>>('/carrier-documents', data),
  updateDocument: (id: number, data: Partial<CarrierDocument>) =>
    api.put<ApiResponse<CarrierDocument>>(`/carrier-documents/${id}`, data),
  deleteDocument: (id: number) =>
    api.delete<ApiResponse<void>>(`/carrier-documents/${id}`),
};

// --- FILE UPLOADS ---


export interface UploadResponse {
  success: boolean;
  data: {
    fileUrl: string;
    filename: string;
    originalName: string;
    size: number;
  };
}

export const uploadService = {
  uploadFile: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<UploadResponse>('/uploads', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

export const groupService = {
  getGroups: () =>
    api.get<ApiResponse<CarrierGroup[]>>('/groups'),
  getGroup: (id: number) =>
    api.get<ApiResponse<CarrierGroup>>(`/groups/${id}`),
  createGroup: (data: { name: string; description?: string }) =>
    api.post<ApiResponse<CarrierGroup>>('/groups', data),
  updateGroup: (id: number, data: { name: string; description?: string }) =>
    api.put<ApiResponse<CarrierGroup>>(`/groups/${id}`, data),
  deleteGroup: (id: number) =>
    api.delete<ApiResponse<void>>(`/groups/${id}`),
  addCarrierToGroup: (groupId: number, carrierId: number) =>
    api.post<ApiResponse<void>>(`/groups/${groupId}/carriers`, { carrierId }),
  removeCarrierFromGroup: (groupId: number, carrierId: number) =>
    api.delete<ApiResponse<{ success: boolean; message: string }>>(`/groups/${groupId}/carriers/${carrierId}`),
};

export const invoiceService = {
  createInvoice: (data: { number?: string; fileUrl?: string; invoiceNumber?: string; invoicePhotoUrl?: string; loadIds: number[] }) =>
    api.post<ApiResponse<Invoice>>('/invoices', data),
  getInvoices: () =>
    api.get<ApiResponse<Invoice[]>>('/invoices'),
};


