
import { useAuth } from './useAuth'

export function usePermissions() {
  const { user } = useAuth()

  const permissions =
    user?.permissions ?? []

  function hasPermission(
    permission: string
  ): boolean {
    return permissions.includes(permission)
  }

  function hasAnyPermission(
    requiredPermissions: string[]
  ): boolean {
    return requiredPermissions.some(
      (permission) =>
        hasPermission(permission)
    )
  }

  function hasAllPermissions(
    requiredPermissions: string[]
  ): boolean {
    return requiredPermissions.every(
      (permission) =>
        hasPermission(permission)
    )
  }

  return {
    permissions,

    profile: user?.profile ?? null,

    hasPermission,

    hasAnyPermission,

    hasAllPermissions,
  }
}
