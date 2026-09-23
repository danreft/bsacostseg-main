import type { ClientInformation } from "./contact-fields";

// POC fixture only. Replace its caller with a client-data provider when available.
// Contact records deliberately have no authentication-provider identifiers.
export const mockClient: ClientInformation = {
  firstName: "Alex",
  lastName: "Morgan",
  role: "Owner",
  email: "alex.morgan@example.com",
  primaryPhone: "(202) 555-0142",
  secondaryPhone: "",
  entity: "Morgan Property Holdings LLC",
  address: "123 Example Lane",
  addressLine2: "Suite 200",
  city: "Austin",
  state: "TX",
  zip: "78701",
};
