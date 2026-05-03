import { useTranslation } from "react-i18next"

import { faqItems } from "@/components/home/home-data"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

export default function HomeFaq() {
  const { t } = useTranslation()

  return (
    <section
      id="faq"
      aria-labelledby="home-faq-title"
      className="scroll-fade-in border-b bg-muted/35 py-16 sm:py-20 lg:py-24"
    >
      <div className="mx-auto grid w-full max-w-4xl gap-8 px-4 sm:px-6 lg:px-8">
        <header className="text-center">
          <p className="text-sm font-medium text-primary">
            {t("home.faq.eyebrow")}
          </p>
          <h2
            id="home-faq-title"
            className="mt-3 text-3xl font-semibold tracking-normal text-balance sm:text-4xl"
          >
            {t("home.faq.title")}
          </h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            {t("home.faq.description")}
          </p>
        </header>

        <Accordion type="single" collapsible className="rounded-xl border px-5">
          {faqItems.map((item) => (
            <AccordionItem key={item.key} value={item.key}>
              <AccordionTrigger className="text-base">
                {t(`home.faq.items.${item.key}.question`)}
              </AccordionTrigger>
              <AccordionContent className="text-base leading-7">
                {t(`home.faq.items.${item.key}.answer`)}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}
