type ModulePlaceholderProps = {
  title: string;
  group: string;
  description: string;
  endpoints: string[];
};

export function ModulePlaceholder({
  title,
  group,
  description,
  endpoints,
}: ModulePlaceholderProps) {
  return (
    <section className="rounded-md border border-[#dce3ee] bg-white p-6">
      <p className="text-sm font-medium text-[#55708f]">{group}</p>
      <h2 className="mt-1 text-2xl font-semibold">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-[#667892]">
        {description}
      </p>
      <div className="mt-5 rounded-md border border-[#e5ebf3] bg-[#f8fafc] p-4">
        <p className="text-sm font-semibold text-[#334155]">
          API sẽ nối tiếp theo
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {endpoints.map((endpoint) => (
            <code
              key={endpoint}
              className="rounded-md border border-[#dce3ee] bg-white px-2 py-1 text-xs text-[#42526b]"
            >
              {endpoint}
            </code>
          ))}
        </div>
      </div>
    </section>
  );
}
