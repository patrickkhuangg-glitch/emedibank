import { Container } from '@/components/container'
import { LoadingSplash } from '@/components/spinner'

export default function Loading() {
  return (
    <Container className="py-10">
      <LoadingSplash />
    </Container>
  )
}
