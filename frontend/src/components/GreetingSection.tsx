interface GreetingSectionProps {
    greetingLabel: string;
    userName: string;
}

export function GreetingSection({ greetingLabel, userName }: GreetingSectionProps) {
    return (
        <section className="px-6 py-6 latte-gradient">
            <div className="flex flex-col items-start gap-1">
                <span className="text-primary font-medium text-sm tracking-wider uppercase">
                    {greetingLabel}
                </span>
                <h2 className="text-3xl font-bold text-slate-100">{userName}</h2>
            </div>
        </section>
    );
}
