'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData) {
  const supabase =  await createClient()

  const email = formData.get('email')
  const password = formData.get('password')

  const { data: { user }, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  
  if (user) {
    redirect('/notes')
  } else {
    redirect('/')
  }
}

export async function logout() {
  const supabase =  await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/')
}
