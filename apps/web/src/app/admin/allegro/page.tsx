import { redirect } from 'next/navigation'

/** /admin/allegro → merged into Settings > Integracje */
export default function AdminAllegroPage() {
  redirect('/admin/settings')
}
