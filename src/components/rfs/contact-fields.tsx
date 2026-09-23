export type ContactInformation = {
  firstName: string;
  lastName: string;
  role: string;
  email: string;
  primaryPhone: string;
  secondaryPhone: string;
};

export type OwnerInformation = {
  entity: string;
  address: string;
  addressLine2: string;
  city: string;
  state: string;
  zip: string;
};

export type ClientInformation = ContactInformation & OwnerInformation;

export const emptyContact: ContactInformation = {
  firstName: "", lastName: "", role: "", email: "", primaryPhone: "", secondaryPhone: "",
};
export const emptyClient: ClientInformation = {
  ...emptyContact, entity: "", address: "", addressLine2: "", city: "", state: "", zip: "",
};

type FieldDefinition<T> = {
  key: keyof T;
  label: string;
  autoComplete: string;
  type?: "email" | "tel";
  optional?: boolean;
  wide?: boolean;
};

const contactFields: FieldDefinition<ContactInformation>[] = [
  { key: "firstName", label: "First Name", autoComplete: "given-name" },
  { key: "lastName", label: "Last Name", autoComplete: "family-name" },
  { key: "role", label: "Title / Role", autoComplete: "organization-title" },
  { key: "email", label: "Email", autoComplete: "email", type: "email" },
  { key: "primaryPhone", label: "Primary Phone", autoComplete: "tel", type: "tel" },
  { key: "secondaryPhone", label: "Secondary Phone", autoComplete: "tel", type: "tel", optional: true },
];
const ownerFields: FieldDefinition<OwnerInformation>[] = [
  { key: "entity", label: "Legal Owner / Entity Name", autoComplete: "organization", wide: true },
  { key: "address", label: "Address", autoComplete: "address-line1", wide: true },
  { key: "addressLine2", label: "Address Line 2", autoComplete: "address-line2", optional: true, wide: true },
  { key: "city", label: "City", autoComplete: "address-level2" },
  { key: "state", label: "State", autoComplete: "address-level1" },
  { key: "zip", label: "ZIP Code", autoComplete: "postal-code" },
];

function Fields<T extends object>({ definitions, value, onChange, prefix, optional = false }: {
  definitions: FieldDefinition<T>[];
  value: T;
  onChange: (value: T) => void;
  prefix: string;
  optional?: boolean;
}) {
  return <div className="field-grid">{definitions.map((field) => {
    const id = `${prefix}-${String(field.key)}`;
    const required = !optional && !field.optional;
    return <div className={`form-field${field.wide ? " field-wide" : ""}${["city", "state", "zip"].includes(String(field.key)) ? " field-locality" : ""}`} key={id}>
      <label htmlFor={id}>{field.label}{required && <span aria-hidden="true"> *</span>}</label>
      <input id={id} name={id} type={field.type ?? "text"} required={required}
        pattern={required ? ".*\\S.*" : undefined}
        autoComplete={`section-${prefix} ${field.autoComplete}`}
        value={String(value[field.key])}
        onChange={(event) => {
          onChange({ ...value, [field.key]: event.target.value });
        }}
      />
    </div>;
  })}</div>;
}

export function ContactFields(props: { value: ContactInformation; onChange: (value: ContactInformation) => void; prefix: string; optional?: boolean }) {
  return <Fields {...props} definitions={contactFields} />;
}

export function OwnerFields(props: { value: OwnerInformation; onChange: (value: OwnerInformation) => void; prefix: string }) {
  return <Fields {...props} definitions={ownerFields} />;
}
