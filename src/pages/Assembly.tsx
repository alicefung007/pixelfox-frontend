import { useNavigate } from "react-router-dom"
import AssemblyDialog from "@/components/editor/AssemblyDialog"

export default function Assembly() {
  const navigate = useNavigate()

  return (
    <AssemblyDialog
      standalone
      open
      onOpenChange={(nextOpen) => {
        if (!nextOpen) navigate("/editor")
      }}
    />
  )
}
