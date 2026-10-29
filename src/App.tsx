import { createHashRouter, RouterProvider } from 'react-router'
import { useStore } from './store/store'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { Compose } from './pages/Compose'
import { Invoices } from './pages/Invoices'
import { Clients } from './pages/Clients'
import { Calculator } from './pages/Calculator'
import { Settings } from './pages/Settings'
import { Welcome } from './pages/Welcome'

// Hash router: statikus hostingon (GitHub Pages) is működik szerveroldali átirányítás nélkül
const router = createHashRouter([
  {
    element: <Layout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'szamlazas', element: <Compose /> },
      { path: 'szamlazas/:id', element: <ComposeKeyed /> },
      { path: 'szamlak', element: <Invoices /> },
      { path: 'ugyfelek', element: <Clients /> },
      { path: 'kalkulator', element: <Calculator /> },
      { path: 'beallitasok', element: <Settings /> },
    ],
  },
])

function ComposeKeyed() {
  // új példány minden szerkesztett számlához, hogy a form állapota ne keveredjen
  return <Compose key={location.hash} />
}

export default function App() {
  const onboarded = useStore((s) => s.onboarded)
  return onboarded ? <RouterProvider router={router} /> : <Welcome />
}
