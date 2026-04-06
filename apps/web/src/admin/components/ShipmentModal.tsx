'use client'

import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { adminApi } from '../lib/adminApiClient'
import type { AdminOrder, CreateShipmentPayload, DeliveryServiceInfo } from '../types/admin-api'

interface ShipmentModalProps {
  order: AdminOrder
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

type Step = 1 | 2 | 3

const STEP_LABELS = ['Przewoznik', 'Paczka', 'Potwierdzenie']

export function ShipmentModal({ order, isOpen, onClose, onSuccess }: ShipmentModalProps) {
  const [step, setStep] = useState<Step>(1)
  const [services, setServices] = useState<DeliveryServiceInfo[]>([])
  const [loadingServices, setLoadingServices] = useState(true)

  const [selectedService, setSelectedService] = useState<DeliveryServiceInfo | null>(null)

  const [length, setLength] = useState('')
  const [width, setWidth] = useState('')
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [referenceNumber, setReferenceNumber] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [progressStep, setProgressStep] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return

    setStep(1)
    setSelectedService(null)
    setLength('')
    setWidth('')
    setHeight('')
    setWeight('')
    setReferenceNumber(order.orderNumber.slice(0, 35))
    setError(null)
    setSubmitting(false)
    setProgressStep(0)
    setServices([])
    setLoadingServices(true)

    adminApi.getDeliveryServices()
      .then((res) => setServices(res.data))
      .catch(() => setError('Nie udalo sie pobrac listy przewoznikow'))
      .finally(() => setLoadingServices(false))
  }, [isOpen, order.orderNumber])

  const volumetricWeight = useMemo(() => {
    const l = parseFloat(length)
    const w = parseFloat(width)
    const h = parseFloat(height)
    if (!selectedService?.volumetricDivisor || !l || !w || !h) return null
    return (l * w * h) / selectedService.volumetricDivisor
  }, [height, length, selectedService, width])

  const actualWeight = parseFloat(weight) || 0
  const chargeableWeight = Math.max(actualWeight, volumetricWeight ?? 0)

  const dimensionErrors = useMemo(() => {
    if (!selectedService) return null

    const l = parseFloat(length)
    const w = parseFloat(width)
    const h = parseFloat(height)
    const wt = parseFloat(weight)

    const errors: string[] = []

    if (l && selectedService.maxLength && l > selectedService.maxLength) {
      errors.push(`Dlugosc max ${selectedService.maxLength} cm`)
    }
    if (w && selectedService.maxWidth && w > selectedService.maxWidth) {
      errors.push(`Szerokosc max ${selectedService.maxWidth} cm`)
    }
    if (h && selectedService.maxHeight && h > selectedService.maxHeight) {
      errors.push(`Wysokosc max ${selectedService.maxHeight} cm`)
    }
    if (wt && selectedService.maxWeight && chargeableWeight > selectedService.maxWeight) {
      errors.push(`Waga przeliczeniowa max ${selectedService.maxWeight} kg`)
    }

    return errors.length > 0 ? errors : null
  }, [chargeableWeight, height, length, selectedService, weight, width])

  const canProceedStep2 = !!(length && width && height && weight && !dimensionErrors)

  const handleSubmit = async () => {
    if (!selectedService) return

    setSubmitting(true)
    setError(null)

    try {
      setProgressStep(1)
      const payload: CreateShipmentPayload = {
        carrierId: selectedService.carrierId,
        deliveryMethodId: selectedService.id,
        weight: parseFloat(weight),
        length: parseFloat(length),
        width: parseFloat(width),
        height: parseFloat(height),
        ...(referenceNumber ? { referenceNumber } : {}),
      }

      await adminApi.createShipment(order.id, payload)
      setProgressStep(2)

      setProgressStep(3)
      const blob = await adminApi.getShipmentLabel(order.id)
      setProgressStep(4)

      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 30_000)

      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Wystapil blad')
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose()
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose, submitting])

  if (!isOpen) return null

  const carrierGroups = services.reduce<Record<string, DeliveryServiceInfo[]>>((acc, service) => {
    if (!acc[service.carrierId]) acc[service.carrierId] = []
    acc[service.carrierId].push(service)
    return acc
  }, {})

  const progressLabels = [
    'Tworzenie przesylki w Allegro...',
    'Aktualizacja statusu fulfillment...',
    'Generowanie etykiety PDF...',
    'Gotowe!',
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-[#1A1A1A]/30 backdrop-blur-[2px] animate-in fade-in duration-150"
        onClick={() => !submitting && onClose()}
      />

      <div className="relative w-full max-w-2xl max-h-[84vh] flex flex-col bg-white rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.12)] border border-[#E5E4E1] animate-in slide-in-from-bottom-3 fade-in duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#F0EFEC] shrink-0">
          <h2 className="text-lg font-semibold text-[#1A1A1A]">Nadaj przesylke - {order.orderNumber}</h2>
          {!submitting && (
            <button
              onClick={onClose}
              className="p-1.5 -mr-1.5 rounded-lg text-[#A3A3A3] hover:text-[#1A1A1A] hover:bg-[#F5F4F1] transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>

        <div className="px-6 py-3 border-b border-[#F0EFEC] flex items-center gap-3">
          {STEP_LABELS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                step >= i + 1 ? 'bg-[#1A1A1A] text-white' : 'bg-[#F0EFEC] text-[#A3A3A3]'
              }`}>
                {step > i + 1 ? 'v' : i + 1}
              </div>
              <span className={`text-sm ${step === i + 1 ? 'text-[#1A1A1A] font-medium' : 'text-[#A3A3A3]'}`}>
                {label}
              </span>
              {i < 2 && <div className="w-8 h-px bg-[#E5E4E1]" />}
            </div>
          ))}
        </div>

        <div className="px-6 py-5 overflow-y-auto flex-1">
          {step === 1 && (
            <div>
              {loadingServices ? (
                <div className="text-center py-12 text-[#A3A3A3]">Ladowanie przewoznikow...</div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(carrierGroups).flatMap(([carrierId, list]) =>
                    list.map((service) => (
                      <button
                        key={service.id}
                        className={`p-4 rounded-xl border text-left transition-all ${
                          selectedService?.id === service.id
                            ? 'border-[#1A1A1A] bg-[#F5F4F1] shadow-sm'
                            : 'border-[#E5E4E1] hover:border-[#A3A3A3] hover:bg-[#FAFAF9]'
                        }`}
                        onClick={() => setSelectedService(service)}
                      >
                        <div className="font-medium text-sm text-[#1A1A1A]">{carrierId}</div>
                        <div className="text-xs text-[#A3A3A3] mt-1">{service.name}</div>
                      </button>
                    )),
                  )}
                </div>
              )}
            </div>
          )}

          {step === 2 && selectedService && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-3">Wymiary (cm)</label>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-[#A3A3A3] mb-1">Dlugosc</label>
                    <input
                      type="number"
                      min="1"
                      step="0.1"
                      value={length}
                      onChange={(e) => setLength(e.target.value)}
                      className="admin-input w-full"
                      placeholder="cm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#A3A3A3] mb-1">Szerokosc</label>
                    <input
                      type="number"
                      min="1"
                      step="0.1"
                      value={width}
                      onChange={(e) => setWidth(e.target.value)}
                      className="admin-input w-full"
                      placeholder="cm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#A3A3A3] mb-1">Wysokosc</label>
                    <input
                      type="number"
                      min="1"
                      step="0.1"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      className="admin-input w-full"
                      placeholder="cm"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-1">Waga (kg)</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="admin-input w-48"
                  placeholder="kg"
                />
              </div>

              {(actualWeight > 0 || volumetricWeight) && (
                <div className="bg-[#F5F4F1] rounded-xl p-4 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-[#666]">Waga rzeczywista:</span>
                    <span className="tabular-nums">{actualWeight.toFixed(1)} kg</span>
                  </div>
                  {volumetricWeight !== null && (
                    <div className="flex justify-between">
                      <span className="text-[#666]">Waga gabarytowa:</span>
                      <span className="tabular-nums">{volumetricWeight.toFixed(1)} kg</span>
                    </div>
                  )}
                  <div className="flex justify-between font-medium pt-1 border-t border-[#E5E4E1]">
                    <span>Waga przeliczeniowa:</span>
                    <span className="tabular-nums">{chargeableWeight.toFixed(1)} kg</span>
                  </div>
                </div>
              )}

              {dimensionErrors && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                  {dimensionErrors.map((dimensionError) => (
                    <div key={dimensionError}>! {dimensionError}</div>
                  ))}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-1">
                  Numer referencyjny <span className="text-[#A3A3A3] font-normal">(opcjonalnie, max 35 znakow)</span>
                </label>
                <input
                  type="text"
                  maxLength={35}
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  className="admin-input w-full"
                />
              </div>
            </div>
          )}

          {step === 3 && selectedService && (
            <div className="space-y-4">
              {!submitting ? (
                <div className="bg-[#F5F4F1] rounded-xl p-5 text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[#666]">Przewoznik:</span>
                    <span className="font-medium">{selectedService.carrierId} - {selectedService.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#666]">Wymiary:</span>
                    <span className="tabular-nums">{length} x {width} x {height} cm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#666]">Waga przeliczeniowa:</span>
                    <span className="tabular-nums">{chargeableWeight.toFixed(1)} kg</span>
                  </div>
                  {referenceNumber && (
                    <div className="flex justify-between">
                      <span className="text-[#666]">Referencja:</span>
                      <span className="font-mono text-xs">{referenceNumber}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3 py-4">
                  {progressLabels.map((label, i) => (
                    <div key={label} className="flex items-center gap-3 text-sm">
                      {progressStep > i + 1 ? (
                        <span className="text-green-600">v</span>
                      ) : progressStep === i + 1 ? (
                        <span className="animate-spin">o</span>
                      ) : (
                        <span className="text-[#D4D3D0]">o</span>
                      )}
                      <span className={progressStep >= i + 1 ? 'text-[#1A1A1A]' : 'text-[#D4D3D0]'}>{label}</span>
                    </div>
                  ))}
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{error}</div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-[#F0EFEC] shrink-0">
          <div>
            {step > 1 && !submitting && (
              <button
                className="text-sm text-[#666] hover:text-[#1A1A1A] transition-colors"
                onClick={() => setStep((prev) => (prev - 1) as Step)}
              >
                Wstecz
              </button>
            )}
          </div>

          <div className="flex gap-3">
            {!submitting && (
              <button className="btn-secondary text-sm" onClick={onClose}>Anuluj</button>
            )}

            {step === 1 && (
              <button
                disabled={!selectedService}
                className="btn-primary text-sm disabled:opacity-40"
                onClick={() => setStep(2)}
              >
                Dalej
              </button>
            )}

            {step === 2 && (
              <button
                disabled={!canProceedStep2}
                className="btn-primary text-sm disabled:opacity-40"
                onClick={() => setStep(3)}
              >
                Dalej
              </button>
            )}

            {step === 3 && !submitting && (
              <button className="btn-primary text-sm" onClick={handleSubmit}>
                Nadaj i pobierz etykiete
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
