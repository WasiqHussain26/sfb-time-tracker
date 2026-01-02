import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://owgapwwtsffavyabhbtv.supabase.co"; 
const SUPABASE_KEY = "sb_publishable_nwk7LOl2Ckk4Igqpdj4gpQ_lcZM66k7"; 

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const uploadScreenshot = async (dataUrl: string, userId: string) => {
  const timestamp = new Date().getTime();
  const filename = `${userId}/${timestamp}.png`;

  // Convert Base64 to Blob manually (safest in Electron)
  const res = await fetch(dataUrl);
  const blob = await res.blob();

  // FIX: Removed 'data' from destructuring because it was unused and causing a build error
  const { error } = await supabase
    .storage
    .from('screenshots')
    .upload(filename, blob, {
      contentType: 'image/png',
      upsert: false
    });

  if (error) {
    throw error;
  }

  const { data: publicData } = supabase
    .storage
    .from('screenshots')
    .getPublicUrl(filename);

  return publicData.publicUrl;
};