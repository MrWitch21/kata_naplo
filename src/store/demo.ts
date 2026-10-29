import type { AppData, Client, Invoice } from './schema'
import { renderNumber } from '../domain/invoiceNumber'

/**
 * Kitalált demóadatok. Minden név, adószám és számlaszám fiktív.
 * Az idei évre generál számlákat a mai napig, hogy a demó mindig "élő" legyen.
 */
export function demoData(now = new Date()): AppData {
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const clients: Client[] = [
    {
      id: 'c1',
      name: 'Kovács Anna',
      kind: 'magan',
      taxNumber: '',
      address: '9021 Győr, Példa utca 4.',
      email: 'anna@example.com',
      note: 'Webshop karbantartás, havidíjas',
    },
    {
      id: 'c2',
      name: 'Szabó Bence',
      kind: 'magan',
      taxNumber: '',
      address: '2900 Komárom, Minta tér 2.',
      email: 'bence@example.com',
      note: 'Programozás korrepetálás',
    },
    {
      id: 'c3',
      name: 'Tóth Réka',
      kind: 'magan',
      taxNumber: '',
      address: '1117 Budapest, Kitalált út 11.',
      email: 'reka@example.com',
      note: 'Portfólió oldal',
    },
    {
      id: 'c4',
      name: 'Nagy Péter',
      kind: 'magan',
      taxNumber: '',
      address: '9022 Győr, Próba köz 7.',
      email: 'peter@example.com',
      note: 'Egyszeri munkák',
    },
  ]

  const fmt = { pattern: 'KN-{YYYY}-{N}', padding: 3 }
  const invoices: Invoice[] = []
  let seq = 0
  const pad = (n: number) => String(n).padStart(2, '0')
  const add = (m: number, day: number, clientId: string, amount: number, description: string, paid: boolean) => {
    seq += 1
    const issue = `${year}-${pad(m)}-${pad(day)}`
    const due = `${year}-${pad(m)}-${pad(Math.min(day + 8, 28))}`
    invoices.push({
      id: `i${seq}`,
      number: renderNumber(fmt, year, seq),
      clientId,
      description,
      amount,
      issueDate: issue,
      fulfillmentDate: issue,
      dueDate: due,
      paidDate: paid ? `${year}-${pad(m)}-${pad(Math.min(day + 5, 28))}` : null,
      note: '',
    })
  }

  for (let m = 1; m <= month; m++) {
    const last = m === month
    add(m, 3, 'c1', 480_000, 'Webshop karbantartás, havidíj', !last)
    add(m, 10, 'c2', 120_000, 'Programozás korrepetálás, 8 óra', !last)
    if (m % 3 === 0) add(m, 18, 'c4', 450_000 + m * 20_000, 'Hibajavítás és beállítás', true)
    if (m === 4) add(m, 20, 'c3', 2_400_000, 'Portfólió oldal fejlesztése', true)
    if (m === 9) add(m, 22, 'c3', 1_600_000, 'Portfólió oldal, 2. ütem', true)
  }

  return {
    version: 1,
    profile: {
      name: 'Minta Máté e.v.',
      address: '9021 Győr, Kitalált utca 1.',
      taxNumber: '12345678-1-08',
      registrationNumber: '58123456',
      bankAccount: '11773000-00000000-00000000',
      iban: 'HU00 1177 3000 0000 0000 0000 0000',
      email: 'szamla@example.com',
      phone: '+36 30 000 0000',
      invoiceNote: 'Kisadózó',
      vatExempt: true,
      numberPattern: fmt.pattern,
      numberPadding: fmt.padding,
      paymentTermDays: 8,
    },
    clients,
    invoices,
    years: {
      [year]: { track: 'regi', fromMonth: 1, toMonth: 12, exemptMonths: [] },
      [year + 1]: { track: year + 1 >= 2027 ? 'fo' : 'regi', fromMonth: 1, toMonth: 12, exemptMonths: [] },
    },
  }
}
