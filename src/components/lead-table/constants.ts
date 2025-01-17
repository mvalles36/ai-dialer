export const FIELD_MAPPINGS = {
  company_name: "Company Name",
  contact_name: "Contact Name",
  phone: "Phone",
  email: "Email",
  status: "Status",
  timezone: "Timezone",
  call_attempts: "Call Attempts",
  last_called_at: "Last Called At",
} as const;

export const STATUS_STYLES = {
  untouched: "bg-gray-100 text-gray-800 hover:bg-gray-200", // Added "untouched" status
  pending: "bg-blue-100 text-blue-800 hover:bg-blue-200",
  calling: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
  no_answer: "bg-orange-100 text-orange-800 hover:bg-orange-200",
  scheduled: "bg-green-100 text-green-800 hover:bg-green-200",
  not_interested: "bg-red-100 text-red-800 hover:bg-red-200",
} as const;

export const NON_EDITABLE_FIELDS = ["last_called_at", "created_at", "updated_at"];

// Local Storage Keys
export const STORAGE_KEYS = {
  PAGE_SIZE: "leadTablePageSize",
  SORT_STATE: "leadTableSort",
  SIDEBAR_COLLAPSED: "sidebarCollapsed",
} as const;

// Default Values
export const DEFAULTS = {
  PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
} as const;
