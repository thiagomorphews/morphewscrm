import { supabase } from '@/integrations/supabase/client';

export interface DuplicateLeadInfo {
  id: string;
  name: string;
  whatsapp: string;
}

/**
 * Checks if a WhatsApp number already exists for another lead in the same organization
 * @param whatsapp - The WhatsApp number to check
 * @param excludeLeadId - Optional lead ID to exclude (useful when editing)
 * @returns The duplicate lead info if found, null otherwise
 */
export async function checkDuplicateWhatsApp(
  whatsapp: string,
  excludeLeadId?: string
): Promise<DuplicateLeadInfo | null> {
  if (!whatsapp || whatsapp.trim() === '') {
    return null;
  }

  // Normalize the phone number (remove non-digits)
  const normalizedPhone = whatsapp.replace(/\D/g, '');
  
  if (normalizedPhone.length < 8) {
    return null;
  }

  // Query for existing lead with same WhatsApp in the organization
  let query = supabase
    .from('leads')
    .select('id, name, whatsapp')
    .eq('whatsapp', normalizedPhone)
    .limit(1);

  // Exclude current lead if editing
  if (excludeLeadId) {
    query = query.neq('id', excludeLeadId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error('Error checking duplicate WhatsApp:', error);
    return null;
  }

  if (data) {
    return {
      id: data.id,
      name: data.name,
      whatsapp: data.whatsapp,
    };
  }

  return null;
}
