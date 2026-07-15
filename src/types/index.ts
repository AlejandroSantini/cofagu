export type UserRole = 'ADMIN' | 'EMPLOYEE';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  carrierId?: number;
}

export interface Carrier {
  id: number;
  name: string;
  cuit: string;
  contactEmail: string;
  contactPhone: string;
}

export interface Driver {
  id: number;
  name: string;
  dni: string;
  phone: string;
  carrierId: number;
  carrier?: Carrier;
}

export interface Truck {
  id: number;
  plate: string;
  type: string;
  capacity: number;
  carrierId: number;
  carrier?: Carrier;
}

export type LoadStatus = 'PENDING' | 'PUBLISHED' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface Application {
  id: number;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  carrierId: number;
  carrier?: Carrier;
  notes?: string;
}

export interface Contingency {
  id: number;
  description: string;
  reportedBy: string;
  createdAt: string;
}

export interface Load {
  id: number;
  origin: string;
  destination: string;
  date: string;
  rate: number;
  status: LoadStatus;
  notes?: string;
  carrierId?: number | null;
  driverId?: number | null;
  truckId?: number | null;
  applications?: Application[];
  contingencies?: Contingency[];
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  pagination?: {
    total: number;
    page?: number;
    limit?: number;
  };
}

export interface CreateCarrierPayload {
  name: string;
  cuit: string;
  contactEmail: string;
  contactPhone: string;
}

export interface CreateDriverPayload {
  name: string;
  dni: string;
  phone: string;
  carrierId: number;
}

export interface CreateTruckPayload {
  plate: string;
  type: string;
  capacity: number;
  carrierId: number;
}

export interface CreateLoadPayload {
  origin: string;
  destination: string;
  date: string;
  rate: number;
  notes?: string;
}
