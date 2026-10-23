import { cn } from "@/lib/cn";
import { GENDER_OPTIONS, type Gender } from "./gender";

/**
 * Gênero (2026-10-23): três pílulas de escolha única, com o mesmo rótulo e a
 * mesma altura (50px) dos campos do formulário.
 *
 * `<input type="radio">` de verdade por baixo, e não um select: são só três
 * opções, todas visíveis num clique, e o rádio nativo dá teclado (setas) e
 * leitor de tela de graça. Não precisa de estado: o formulário lê o valor pelo
 * `FormData` (`name="gender"`).
 */
export function GenderField({ error, defaultValue }: { error?: string; defaultValue?: Gender | null }) {
  const errorId = "gender-error";
  return (
    <fieldset
      className="flex w-full flex-col gap-3"
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? errorId : undefined}
    >
      <legend className="mb-3 font-helvetica text-[18px] leading-[21px] font-bold tracking-[0.18px] text-white">
        Gênero
      </legend>
      <div className="grid grid-cols-1 gap-[12px] sm:grid-cols-3">
        {GENDER_OPTIONS.map((option) => (
          <label key={option.value} className="relative cursor-pointer">
            <input
              type="radio"
              name="gender"
              value={option.value}
              defaultChecked={defaultValue === option.value}
              className="peer sr-only"
            />
            <span
              className={cn(
                "flex h-[50px] items-center justify-center rounded-full border bg-[image:var(--brand-surface-fill)] px-[16px] font-poppins text-[15px] text-white/80 transition-colors",
                "peer-checked:border-brand-orange peer-checked:font-semibold peer-checked:text-white",
                "peer-focus-visible:ring-2 peer-focus-visible:ring-brand-orange peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-brand-bg",
                "hover:text-white",
                error ? "border-red-9" : "border-brand-border",
              )}
            >
              {option.label}
            </span>
          </label>
        ))}
      </div>
      {error ? (
        <p id={errorId} role="alert" className="font-helvetica text-[14px] text-red-9">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
