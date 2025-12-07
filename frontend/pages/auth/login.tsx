import { LoginModal } from '../../components/auth/LoginModal'
import { useState } from 'react'

export default function LoginPage() {
  const [showModal, setShowModal] = useState(true)
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      {showModal && <LoginModal onClose={() => setShowModal(false)} />}
    </div>
  )
}
