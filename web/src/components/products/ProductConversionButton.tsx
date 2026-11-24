
import {
  useCallback,
  useState,
} from 'react'

import { PackageOpen } from 'lucide-react'

import {
  usePermissions,
} from '../../hooks/usePermissions'

import type { Product } from '../../types/product'

import ProductConversionModal from './ProductConversionModal'

import '../../styles/product-conversions.css'

interface ProductConversionButtonProps {
  product: Product
  onSaved?: () => void
}

export default function ProductConversionButton({
  product,
  onSaved,
}: ProductConversionButtonProps) {
  const { hasPermission } = usePermissions()

  const [open, setOpen] = useState(false)

  const canConfigure =
    hasPermission('products.view') &&
    hasPermission('products.update') &&
    hasPermission('products.conversion')

  const isUnitProduct =
    product.unit === 'UN' &&
    product.saleType === 'UNIT'

  const closeModal = useCallback(() => {
    setOpen(false)
  }, [])

  if (
    !canConfigure ||
    !isUnitProduct
  ) {
    return null
  }

  return (
    <>

      <button
        type="button"
        className="product-conversion-button"
        title="Configurar fracionamento"
        aria-label={
          `Configurar fracionamento de ${product.name}`
        }
        onClick={() => setOpen(true)}
      >
        <PackageOpen size={18} />
      </button>

      {open && (
        <ProductConversionModal
          product={product}
          onClose={closeModal}
          onSaved={onSaved}
        />
      )}

    </>
  )
}
