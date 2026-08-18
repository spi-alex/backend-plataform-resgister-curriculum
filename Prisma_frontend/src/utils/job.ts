// Formato retornado pelo JobSerializer do backend (jobs/serializers.py)
export interface Job {
  id: number;
  company_name: string;
  company_website?: string;
  contact_email?: string;
  title: string;
  description: string;
  requirements: string;
  salary: string | null;
  is_active: boolean;
  created_at: string; // já formatado como dd/mm/aaaa pelo backend
}

export function formatSalary(salary: string | null): string | null {
  if (!salary) return null;
  const value = Number(salary);
  if (Number.isNaN(value)) return salary;
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
