export const demoRequests = [
  {
    id: 'demo-req-1',
    demo: true,
    service: { issueName: 'Battery Jump Start', serviceType: 'jump_start' },
    vehicle: { make: 'Toyota Highlander', model: 'XLE', year: '2018' },
    pickup: { address: '123 Main St, Bolingbrook, IL 60440' },
    payment: { totalHeld: 89 },
    eta: 'ETA 15 min',
    distance: '3.2 mi away',
  },
  {
    id: 'demo-req-2',
    demo: true,
    service: { issueName: 'Flat Tire Change', serviceType: 'tire_change' },
    vehicle: { make: 'Honda Accord', model: 'Sport', year: '2021' },
    pickup: { address: '456 Oak Ave, Naperville, IL 60540' },
    payment: { totalHeld: 69 },
    eta: 'ETA 20 min',
    distance: '5.8 mi away',
  },
  {
    id: 'demo-req-3',
    demo: true,
    service: { issueName: 'Towing Service', serviceType: 'towing' },
    vehicle: { make: 'Ford F-150', model: 'XLT', year: '2019' },
    pickup: { address: '789 Maple Dr, Aurora, IL 60505' },
    dropoff: { address: '200 Service Rd, Downers Grove, IL 60515' },
    payment: { totalHeld: 145 },
    eta: 'ETA 25 min',
    distance: '7.1 mi away',
  },
  {
    id: 'demo-req-4',
    demo: true,
    service: { issueName: 'Car Lockout', serviceType: 'lockout' },
    vehicle: { make: 'BMW 3 Series', model: '330i', year: '2022' },
    pickup: { address: '55 Commerce Blvd, Woodridge, IL 60517' },
    payment: { totalHeld: 75 },
    eta: 'ETA 12 min',
    distance: '2.4 mi away',
  },
  {
    id: 'demo-req-5',
    demo: true,
    service: { issueName: 'Mobile Diagnostics', serviceType: 'mobile_mechanic' },
    vehicle: { make: 'Chevy Tahoe', model: 'LT', year: '2020' },
    pickup: { address: '321 Industrial Pkwy, Romeoville, IL 60446' },
    payment: { totalHeld: 120 },
    eta: 'ETA 18 min',
    distance: '6.5 mi away',
  },
];

export const demoCompletedJobs = [
  {
    id: 'demo-job-completed-1',
    demo: true,
    number: '10091',
    status: 'completed',
    service: { issueName: 'Battery Jump Start', serviceType: 'jump_start', type: 'Jump Start' },
    vehicle: { make: 'Toyota', model: 'Camry', year: '2020', color: 'Silver', vin: '4T1B11HK3KU123456' },
    pickup: { address: '501 Preston Dr, Bolingbrook, IL 60440' },
    customer: { name: 'Marcus Johnson', initials: 'MJ', phone: '(630) 555-0192' },
    payment: { method: 'card', last4: '4242', total: 89 },
    acceptedAt: new Date(Date.now() - 78 * 60000).toISOString(),
    completedAt: new Date(Date.now() - 12 * 60000).toISOString(),
    invoiceNumber: 'INV-10091',
    customerNote: 'Car wouldn\'t start this morning. Battery is about 4 years old.',
  },
];

export const activity = [
  { icon: 'wallet-outline', color: '#22C55E', title: 'Payment received', meta: 'Today, 8:45 AM', value: '$89.00' },
  { icon: 'star', color: '#FFC107', title: 'New 5-star review', meta: 'Great service! Very professional.', value: '5.0' },
  { icon: 'checkmark-done', color: '#2F80FF', title: 'Job completed', meta: 'Battery Replacement - Job #12341', value: '$125.00' },
];

export const schedule = [
  { time: '10:30 AM', title: 'Battery Jump', vehicle: 'Toyota Camry', eta: 'In 15 min' },
  { time: '12:15 PM', title: 'Tire Change', vehicle: 'Honda Accord', eta: 'In 2h' },
  { time: '2:00 PM', title: 'Diagnostics', vehicle: 'BMW X5', eta: 'In 3h 45m' },
];
