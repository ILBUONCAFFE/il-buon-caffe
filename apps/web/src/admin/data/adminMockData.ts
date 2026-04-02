// revenueData, weeklyData, activities removed — dashboard now uses live API calls

export type Order = {
  id: string
  customer: string
  item: string
  price: number
  status: string
  time: string
}

export const orders: Order[] = [
  { id: 'ORD-7821', customer: 'Anna Kowalska', item: 'MacBook Pro 16"', price: 12499, status: 'completed', time: '2 min' },
  { id: 'ORD-7822', customer: 'Jan Nowak', item: 'iPhone 15 Pro', price: 5999, status: 'processing', time: '12 min' },
  { id: 'ORD-7823', customer: 'Maria Wiśniewska', item: 'iPad Air M2', price: 3299, status: 'pending', time: '28 min' },
  { id: 'ORD-7824', customer: 'Piotr Lewandowski', item: 'AirPods Max', price: 2499, status: 'completed', time: '1 godz.' },
  { id: 'ORD-7825', customer: 'Katarzyna Dąbrowska', item: 'Apple Watch Ultra', price: 3999, status: 'shipped', time: '2 godz.' },
  { id: 'ORD-7826', customer: 'Tomasz Mazur', item: 'iMac 24"', price: 8999, status: 'pending', time: '3 godz.' },
  { id: 'ORD-7827', customer: 'Ewa Kamińska', item: 'MacBook Air M3', price: 5499, status: 'processing', time: '4 godz.' },
  { id: 'ORD-7828', customer: 'Michał Lis', item: 'iPad Pro 12.9"', price: 7299, status: 'shipped', time: '5 godz.' }
]

export const notifications = [
  { id: 1, title: 'Nowe zamówienie', message: 'Kawa Arabica Etiopia 500g × 3 — 187 PLN', time: '2 min temu', unread: true },
  { id: 2, title: 'Płatność otrzymana', message: '342 PLN od Anny Kowalskiej', time: '18 min temu', unread: true },
  { id: 3, title: 'Wysyłka', message: 'Zestaw win toskańskich został nadany', time: '1 godz. temu', unread: false },
  { id: 4, title: 'Niski stan magazynowy', message: 'Pecorino Romano DOP — zostały 3 szt.', time: '4 godz. temu', unread: false }
]
