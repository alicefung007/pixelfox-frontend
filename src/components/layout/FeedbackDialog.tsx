import { type FormEvent, useState } from "react"
import { useTranslation } from "react-i18next"
import { Bug, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FEEDBACK_CONFIG } from "@/lib/constants"

export default function FeedbackDialog() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [content, setContent] = useState("")
  const [email, setEmail] = useState("")

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const body = [
      `${t("nav.feedbackDialog.contentLabel")}:`,
      content.trim(),
      "",
      `${t("nav.feedbackDialog.emailLabel")}: ${email.trim() || "-"}`,
      `URL: ${window.location.href}`,
    ].join("\n")

    const mailtoHref = `mailto:${FEEDBACK_CONFIG.EMAIL}?subject=${encodeURIComponent(t("nav.feedbackDialog.emailSubject"))}&body=${encodeURIComponent(body)}`
    window.location.href = mailtoHref
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-muted-foreground"
          aria-label={t("nav.feedback")}
          title={t("nav.feedback")}
        >
          <Bug className="h-[18px] w-[18px]" />
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[calc(100vw-32px)] max-w-lg gap-0 overflow-hidden rounded-2xl border-border/60 p-0">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="border-b border-border/60 px-6 py-6 text-left">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <DialogTitle className="flex items-center gap-2 text-xl leading-tight">
                  <span className="inline-flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Bug className="size-4" />
                  </span>
                  <span>{t("nav.feedbackDialog.title")}</span>
                </DialogTitle>
                <DialogDescription className="mt-2 text-sm font-medium">
                  {t("nav.feedbackDialog.description")}{" "}
                  {t("nav.feedbackDialog.recipientEmail", {
                    email: FEEDBACK_CONFIG.EMAIL,
                  })}
                </DialogDescription>
              </div>
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="-mt-2 -mr-2 rounded-full text-muted-foreground"
                  aria-label={t("nav.feedbackDialog.close")}
                >
                  <X className="size-4" />
                </Button>
              </DialogClose>
            </div>
          </DialogHeader>

          <div className="space-y-5 px-6 py-6">
            <div className="space-y-2">
              <Label htmlFor="feedback-content">
                {t("nav.feedbackDialog.contentLabel")}
              </Label>
              <textarea
                id="feedback-content"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder={t("nav.feedbackDialog.contentPlaceholder")}
                required
                rows={6}
                className="min-h-40 w-full resize-y rounded-md border border-transparent bg-input/50 px-3 py-3 text-base transition-[color,box-shadow,background-color,border-color] outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/30 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="feedback-email">
                {t("nav.feedbackDialog.emailLabel")}
              </Label>
              <Input
                id="feedback-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={t("nav.feedbackDialog.emailPlaceholder")}
                className="h-11"
              />
            </div>
          </div>

          <DialogFooter className="border-t border-border/60 bg-muted/20 px-6 py-4">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                {t("nav.feedbackDialog.cancel")}
              </Button>
            </DialogClose>
            <Button type="submit">{t("nav.feedbackDialog.submit")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
