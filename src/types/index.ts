export type UserRole = 'ADMIN' | 'OPERATOR' | 'EMPLOYEE' | 'CARRIER' | 'PLAYERO' | 'GAS_STATION' | 'LOGISTICS' | 'TECHNICAL_CENTER';



export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  carrierId?: number | null;
  mustChangePassword?: boolean;
}

export interface Carrier {
  id: number;
  name: string;
  cuit: string;
  contactEmail: string;
  contactPhone: string;
  user?: User;
  drivers?: Driver[];
  trucks?: Truck[];
  users?: User[];
}

export interface Driver {
  id: number;
  name: string;
  dni: string;
  phone: string;
  carrierId: number;
  carrier?: Carrier;
  suspendedUntil?: string | null;
  absenceCount?: number;
  isSuspended?: boolean;
}

export interface Truck {
  id: number;
  plate?: string;
  chassisPlate?: string;
  trailerPlate?: string;
  type: string;
  capacity: number;
  carrierId: number;
  carrier?: Carrier;
  habilitado?: boolean;
  insurancePolicy?: string;
  insuranceCompany?: string;
  insuranceExpiration?: string;
  insurancePolicyPhotoUrl?: string;
  insuranceStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  cargoInsurancePolicy?: string;
  cargoInsuranceCompany?: string;
  cargoInsuranceExpiration?: string;
  cargoInsurancePhotoUrl?: string;
  cargoInsuranceStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  suspendedUntil?: string | null;
  absenceCount?: number;
  isSuspended?: boolean;
}


export type LoadStatus = 'PENDING' | 'PUBLISHED' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'DELAYED' | 'REJECTED';

export interface Application {
  id: number;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
  tripStatus?: 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  carrierId: number;
  carrier?: Carrier;
  notes?: string;
  driverId?: number;
  truckId?: number;
  driver?: Driver;
  truck?: Truck;
  ctg?: string;
  loadedWeight?: number;
  unloadedWeight?: number;
  waybillUrl?: string;
  fuelConsumption?: number;
  mileage?: number;
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
  maxTrucks?: number;
  arrivedTrucks?: number;
  carrierId?: number | null;
  driverId?: number | null;
  truckId?: number | null;
  carrier?: Carrier;
  driver?: Driver;
  truck?: Truck;
  applications?: Application[];
  contingencies?: Contingency[];
  ctg?: string;
  loadedWeight?: number;
  unloadedWeight?: number;
  fuelConsumption?: number;
  mileage?: number;
  invoiceUrl?: string;
  waybillUrl?: string;
  loadingDate?: string;
  loadingTimeStart?: string;
  loadingTimeEnd?: string;
  quotaDate?: string;
  cereal?: string;
  cuposPendientes?: number;
  invoiceId?: number | null;
  targetGroups?: { groupId: number; rate: number; group?: CarrierGroup }[];
  fuelAuthorized?: boolean;
  differenceAdjusted?: boolean;
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
  contactEmail?: string;
  contactPhone: string;
  password?: string;
}


export interface CreateDriverPayload {
  name: string;
  dni: string;
  phone: string;
  carrierId?: number;
}

export interface CreateTruckPayload {
  plate?: string;
  chassisPlate?: string;
  trailerPlate?: string;
  type: string;
  capacity: number;
  carrierId?: number;
  insurancePolicy?: string;
  insuranceCompany?: string;
  insuranceExpiration?: string;
  insurancePolicyPhotoUrl?: string;
  insuranceStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  cargoInsurancePolicy?: string;
  cargoInsuranceCompany?: string;
  cargoInsuranceExpiration?: string;
  cargoInsurancePhotoUrl?: string;
  cargoInsuranceStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface CreateLoadPayload {
  origin: string;
  destination: string;
  date: string;
  rate: number;
  maxTrucks?: number;
  notes?: string;
  loadingDate: string;
  loadingTimeStart: string;
  loadingTimeEnd: string;
  quotaDate: string;
  cereal: string;
  ctg?: string;
  loadedWeight?: number;
  unloadedWeight?: number;
  fuelConsumption?: number;
  mileage?: number;
  invoiceUrl?: string;
  waybillUrl?: string;
  status?: string;
  targetGroups?: { groupId: number; rate: number }[];
}

export interface AssignLoadResponse {
  id: number;
  status: string;
  maxTrucks: number;
  acceptedCount: number;
  cupoCompleto: boolean;
}

export interface ReportArrivalResponse {
  id: number;
  status: string;
  maxTrucks: number;
  arrivedTrucks: number;
  hayFaltantes: boolean;
  faltantes: number;
}

export interface CarrierDocument {
  id: number;
  carrierId: number;
  carrier?: Carrier;
  truck?: Truck;
  type: string;
  fileUrl: string;
  expirationDate: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  createdAt: string;
  updatedAt: string;
}

export interface CarrierGroupMember {
  carrierId: number;
  groupId: number;
  carrier: {
    id: number;
    name: string;
    cuit: string;
    contactEmail?: string;
    contactPhone?: string;
  };
}

export interface CarrierGroup {
  id: number;
  name: string;
  description?: string;
  createdAt?: string;
  _count?: {
    carriers: number;
    loads: number;
  };
  carriers?: CarrierGroupMember[];
}

export interface Invoice {
  id: number;
  invoiceNumber?: string;
  invoicePhotoUrl?: string;
  loadIds: number[];
  carrierId: number;
  createdAt: string;
}

export interface CreateInvoicePayload {
  number?: string;
  fileUrl?: string;
  invoiceNumber?: string;
  invoicePhotoUrl?: string;
  loadIds: number[];
}

