import type { Customer } from '../types';

export const customers: Customer[] = [
  { id: 1, name: 'TechCorp Inc.',          contactName: 'Alan Park',      email: 'alan@techcorp.com',    phone: '555-1001', notes: 'Key enterprise account'       },
  { id: 2, name: 'Riverside School Dist',  contactName: 'Linda Chen',     email: 'lchen@riverside.edu',  phone: '555-1002', notes: 'Annual transport contract'     },
  { id: 3, name: 'Metro Events Co.',       contactName: 'Ben Davis',      email: 'ben@metroevents.com',  phone: '555-1003', notes: 'Seasonal event work'           },
  { id: 4, name: 'Apex Logistics',         contactName: 'Sara Kim',       email: 'sara@apexlog.com',     phone: '555-1004', notes: 'Weekly warehouse runs'         },
  { id: 5, name: 'City Medical Center',    contactName: 'Dr. Tom Walsh',  email: 'twalsh@citymed.org',   phone: '555-1005', notes: 'Medical supply chain'          },
  { id: 6, name: 'County Fair Authority',  contactName: 'Janet Reed',     email: 'jreed@countyfair.org', phone: '555-1006', notes: 'Annual fair shuttle'           },
  { id: 7, name: 'BuildRight Construction',contactName: 'Frank Lee',      email: 'frank@buildright.com', phone: '555-1007', notes: 'Site haul jobs'                },
  { id: 8, name: 'Airport Authority',      contactName: 'Carol Diaz',     email: 'carol@airport.org',    phone: '555-1008', notes: 'Daily shuttle route'           },
];
