import type { Vehicle } from '../types';

export const vehicles: Vehicle[] = [
  { id: 1,  year: 2021, make: 'Ford',      model: 'F-150',         vin: '1FTFW1E83MFA12345', licensePlate: 'ABC-1234', status: 'active',        mileage: 34210, color: 'White'  },
  { id: 2,  year: 2020, make: 'Chevrolet', model: 'Silverado 1500',vin: '3GCUYDED0LG123456', licensePlate: 'DEF-5678', status: 'active',        mileage: 51880, color: 'Black'  },
  { id: 3,  year: 2022, make: 'RAM',       model: '1500',          vin: '1C6SRFFT3NN123456', licensePlate: 'GHI-9012', status: 'maintenance',   mileage: 22450, color: 'Red'    },
  { id: 4,  year: 2019, make: 'Toyota',    model: 'Tacoma',        vin: '5TFAX5GN0KX123456', licensePlate: 'JKL-3456', status: 'active',        mileage: 67300, color: 'Silver' },
  { id: 5,  year: 2023, make: 'Ford',      model: 'Transit 250',   vin: '1FTBR1C84PKA12345', licensePlate: 'MNO-7890', status: 'active',        mileage: 14500, color: 'White'  },
  { id: 6,  year: 2018, make: 'GMC',       model: 'Sierra 2500HD', vin: '1GT22REG5JF123456', licensePlate: 'PQR-1234', status: 'out_of_service',mileage: 98750, color: 'Gray'   },
  { id: 7,  year: 2021, make: 'Nissan',    model: 'Frontier',      vin: '1N6AD0ER8MN123456', licensePlate: 'STU-5678', status: 'active',        mileage: 29800, color: 'Blue'   },
  { id: 8,  year: 2022, make: 'Mercedes',  model: 'Sprinter 2500', vin: 'W1Y40CHY4NT123456', licensePlate: 'VWX-9012', status: 'maintenance',   mileage: 41200, color: 'White'  },
  { id: 9,  year: 2020, make: 'Toyota',    model: 'Tundra',        vin: '5TFDY5F12LX123456', licensePlate: 'YZA-3456', status: 'active',        mileage: 55600, color: 'Black'  },
  { id: 10, year: 2023, make: 'Chevrolet', model: 'Express 2500',  vin: '1GCWGBFP1P1123456', licensePlate: 'BCD-7890', status: 'active',        mileage: 8900,  color: 'White'  },
];
