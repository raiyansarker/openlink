import { getAuth } from './instance'
import { toUserDto } from '../api/serializers'

export async function requireSession(request: Request) {
  const session = await getAuth().api.getSession({ headers: request.headers })
  if (!session?.user) {
    return null
  }

  return {
    session,
    user: toUserDto({
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      createdAt: new Date(session.user.createdAt),
    }),
  }
}
