/**
 * Utilitários para multi-tenancy
 * 
 * Este arquivo contém funções auxiliares para trabalhar com o contexto
 * multi-tenant do CRM Morphews.
 */

// =============================================================================
// TIPOS
// =============================================================================

export type TenantRole = 'owner' | 'admin' | 'member';

export interface TenantPermissions {
  canManageMembers: boolean;
  canManageChannels: boolean;
  canManageSettings: boolean;
  canSeeAllLeads: boolean;
  canDeleteLeads: boolean;
  canExportData: boolean;
}

// =============================================================================
// FUNÇÕES DE PERMISSÃO
// =============================================================================

/**
 * Retorna as permissões baseadas no papel do usuário
 */
export function getPermissionsForRole(role: TenantRole | null): TenantPermissions {
  switch (role) {
    case 'owner':
      return {
        canManageMembers: true,
        canManageChannels: true,
        canManageSettings: true,
        canSeeAllLeads: true,
        canDeleteLeads: true,
        canExportData: true,
      };
    case 'admin':
      return {
        canManageMembers: true,
        canManageChannels: true,
        canManageSettings: true,
        canSeeAllLeads: true,
        canDeleteLeads: true,
        canExportData: true,
      };
    case 'member':
      return {
        canManageMembers: false,
        canManageChannels: false,
        canManageSettings: false,
        canSeeAllLeads: false, // Depende da config can_see_all_leads
        canDeleteLeads: false,
        canExportData: false,
      };
    default:
      return {
        canManageMembers: false,
        canManageChannels: false,
        canManageSettings: false,
        canSeeAllLeads: false,
        canDeleteLeads: false,
        canExportData: false,
      };
  }
}

/**
 * Verifica se o papel tem permissão de admin (owner ou admin)
 */
export function isAdminRole(role: TenantRole | null): boolean {
  return role === 'owner' || role === 'admin';
}

/**
 * Verifica se o papel é owner
 */
export function isOwnerRole(role: TenantRole | null): boolean {
  return role === 'owner';
}

// =============================================================================
// FUNÇÕES DE FORMATAÇÃO
// =============================================================================

/**
 * Formata o papel para exibição
 */
export function formatRole(role: TenantRole | null): string {
  switch (role) {
    case 'owner':
      return 'Proprietário';
    case 'admin':
      return 'Administrador';
    case 'member':
      return 'Membro';
    default:
      return 'Desconhecido';
  }
}

/**
 * Retorna a cor do badge baseada no papel
 */
export function getRoleBadgeColor(role: TenantRole | null): string {
  switch (role) {
    case 'owner':
      return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
    case 'admin':
      return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    case 'member':
      return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    default:
      return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
  }
}

// =============================================================================
// FUNÇÕES DE NORMALIZAÇÃO DE TELEFONE
// =============================================================================

/**
 * Normaliza número de telefone para formato E.164 (apenas dígitos com código do país)
 * Exemplo: "+55 (21) 98208-3745" -> "5521982083745"
 */
export function normalizePhoneE164(phone: string): string {
  // Remove tudo que não é dígito
  let clean = phone.replace(/\D/g, '');

  // Se vazio, retorna vazio
  if (!clean) return '';

  // Adiciona código do Brasil se não tiver e parecer número brasileiro
  if (!clean.startsWith('55') && clean.length <= 11) {
    clean = '55' + clean;
  }

  return clean;
}

/**
 * Formata número de telefone para exibição
 * Exemplo: "5521982083745" -> "+55 (21) 98208-3745"
 */
export function formatPhoneDisplay(phone: string | null | undefined): string {
  if (!phone) return '';

  const clean = phone.replace(/\D/g, '');

  // Formato brasileiro completo (13 dígitos com 9)
  if (clean.length === 13 && clean.startsWith('55')) {
    return `+55 (${clean.slice(2, 4)}) ${clean.slice(4, 9)}-${clean.slice(9)}`;
  }

  // Formato brasileiro sem 9 (12 dígitos)
  if (clean.length === 12 && clean.startsWith('55')) {
    return `+55 (${clean.slice(2, 4)}) ${clean.slice(4, 8)}-${clean.slice(8)}`;
  }

  // Formato sem código do país (11 dígitos com 9)
  if (clean.length === 11) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
  }

  // Formato sem código do país (10 dígitos sem 9)
  if (clean.length === 10) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
  }

  // Retorna o original se não conseguir formatar
  return phone;
}

/**
 * Gera variantes de telefone para busca fuzzy
 * Útil para encontrar leads mesmo com formatos diferentes
 */
export function generatePhoneVariants(phone: string): string[] {
  const normalized = normalizePhoneE164(phone);
  if (!normalized) return [];

  const variants = new Set<string>();
  variants.add(normalized);

  // Sem código do país
  if (normalized.startsWith('55')) {
    variants.add(normalized.slice(2));
  }

  // Com/sem o 9 extra (telefones celulares brasileiros)
  // Formato: 55 + DDD(2) + 9 + número(8) = 13 dígitos
  // Formato antigo: 55 + DDD(2) + número(8) = 12 dígitos
  if (normalized.length === 13 && normalized.startsWith('55')) {
    // Remover o 9 após o DDD
    const withoutNine = normalized.slice(0, 4) + normalized.slice(5);
    variants.add(withoutNine);
    variants.add(withoutNine.slice(2)); // Sem código do país
  } else if (normalized.length === 12 && normalized.startsWith('55')) {
    // Adicionar o 9 após o DDD
    const withNine = normalized.slice(0, 4) + '9' + normalized.slice(4);
    variants.add(withNine);
    variants.add(withNine.slice(2)); // Sem código do país
  }

  return Array.from(variants);
}

// =============================================================================
// FUNÇÕES DE URL/SLUG
// =============================================================================

/**
 * Gera um slug a partir de um nome
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9]+/g, '-') // Substitui caracteres especiais por hífen
    .replace(/^-+|-+$/g, '') // Remove hífens no início e fim
    .slice(0, 50); // Limita tamanho
}

/**
 * Valida se um slug é válido
 */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length >= 3 && slug.length <= 50;
}
