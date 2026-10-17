"use client";

import React, { memo, useEffect, useState } from "react";
import { Contact, Globe, Link as LinkIcon, Mail, UserRound } from "lucide-react";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@geiger/ui";
import NodeShell, { useNodeDataUpdater } from "@/components/internal/nodes/shared/NodeShell";
import TextEditingTrait from "@/components/internal/nodes/traits/TextEditingTrait";
import { getProfileImageUrl, getUser } from "@/lib/supabase/user";

export const PERSON_STATUS = {
  available: { label: "Available", className: "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500" },
  busy: { label: "Busy", className: "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400", dot: "bg-red-500" },
  away: { label: "Away", className: "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400", dot: "bg-amber-500" },
  ooo: { label: "Out of office", className: "bg-zinc-500/10 border-zinc-500/20 text-zinc-600 dark:text-zinc-400", dot: "bg-zinc-400" },
};

export const nodeMeta = {
  type: "person",
  label: "Person",
  icon: Contact,
  cardColor: true,
  create: () => ({
    data: { name: "", role: "", team: "", status: "available", email: "", links: [], timezone: "", avatarUrl: "", userId: null },
    style: { width: 300, height: 210 },
  }),
};

export const browserTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    return "";
  }
};

// Fill a person card from the signed-in user; returns the patch or null when signed out.
export async function personFromCurrentUser() {
  try {
    const user = await getUser();
    if (!user) return null;
    return {
      name: user.name || "",
      email: user.email || "",
      avatarUrl: user.avatar || getProfileImageUrl(user.id) || "",
      userId: user.id,
      timezone: browserTimeZone(),
    };
  } catch {
    return null;
  }
}

export async function applyCurrentUser(update) {
  const patch = await personFromCurrentUser();
  if (patch) {
    update(patch);
    toast.success("Filled from your profile");
  } else {
    toast.error("Sign in to use your profile");
  }
}

const initials = (name = "") =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("") || "?";

// Deterministic hue from the name so the same person always gets the same avatar color.
const avatarHue = (name = "") => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h % 360;
};

const localTime = (tz, now) => {
  if (!tz) return null;
  try {
    const time = new Intl.DateTimeFormat([], { timeZone: tz, hour: "numeric", minute: "2-digit" }).format(now);
    const offset = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "shortOffset" })
      .formatToParts(now)
      .find((p) => p.type === "timeZoneName")?.value;
    return { time, offset };
  } catch {
    return null;
  }
};

const toHref = (url = "") => (/^(https?:|mailto:)/i.test(url) ? url : `https://${url}`);

function Avatar({ name, url, size = 56 }) {
  const [failed, setFailed] = useState(false);
  const hue = avatarHue(name);
  if (url && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name || "Avatar"}
        onError={() => setFailed(true)}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, fontSize: size * 0.36, backgroundColor: `hsl(${hue} 55% 45%)` }}
    >
      {name ? initials(name) : <UserRound className="h-1/2 w-1/2" />}
    </span>
  );
}

function InlineField({ value, onChange, placeholder, className = "" }) {
  return (
    <TextEditingTrait className="min-w-0">
      <input
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full bg-transparent focus:outline-none placeholder:text-muted-foreground ${className}`}
      />
    </TextEditingTrait>
  );
}

function PersonNode({ id, data, selected, dragging }) {
  const update = useNodeDataUpdater(id);
  const [now, setNow] = useState(() => new Date());
  const status = PERSON_STATUS[data.status] || PERSON_STATUS.available;
  const links = Array.isArray(data.links) ? data.links.filter((l) => l?.url) : [];
  const tz = localTime(data.timezone, now);

  useEffect(() => {
    if (!data.timezone) return undefined;
    const handle = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(handle);
  }, [data.timezone]);

  const statusPill = (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${status.className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
      {status.label}
    </span>
  );

  return (
    <NodeShell id={id} data={data} selected={selected} dragging={dragging} minWidth={240} minHeight={150}>
      <div className="flex h-full w-full flex-col gap-3 overflow-hidden p-4 text-foreground">
        <div className="flex items-start gap-3">
          <div className="relative">
            <Avatar key={data.avatarUrl} name={data.name} url={data.avatarUrl} />
            <span
              className={`absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full border-2 ${status.dot}`}
              style={{ borderColor: data.backgroundColor || "var(--node-default)" }}
            />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5">
            {selected ? (
              <>
                <InlineField value={data.name} onChange={(name) => update({ name })} placeholder="Name" className="text-base font-semibold" />
                <InlineField value={data.role} onChange={(role) => update({ role })} placeholder="Role" className="text-sm text-muted-foreground" />
                <InlineField value={data.team} onChange={(team) => update({ team })} placeholder="Team" className="text-xs text-muted-foreground" />
              </>
            ) : (
              <>
                <p className={`truncate text-base font-semibold ${data.name ? "" : "text-muted-foreground"}`}>
                  {data.name || "Unnamed"}
                </p>
                {data.role && <p className="truncate text-sm text-muted-foreground">{data.role}</p>}
                {data.team && <p className="truncate text-xs text-muted-foreground">{data.team}</p>}
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selected ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="nodrag rounded-full" aria-label="Change status">
                  {statusPill}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="border-border bg-surface-subtle">
                {Object.entries(PERSON_STATUS).map(([key, s]) => (
                  <DropdownMenuItem key={key} onSelect={() => update({ status: key })} className="gap-2 text-sm">
                    <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                    {s.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            statusPill
          )}
          {tz && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground" title={data.timezone}>
              <Globe className="h-3 w-3" />
              <span className="tabular-nums text-foreground/80">{tz.time}</span>
              {tz.offset && <span>{tz.offset}</span>}
            </span>
          )}
        </div>

        <div className="flex min-h-0 flex-col gap-1 text-xs">
          {selected ? (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Mail className="h-3.5 w-3.5 shrink-0" />
              <InlineField value={data.email} onChange={(email) => update({ email })} placeholder="Email" className="text-xs text-foreground" />
            </span>
          ) : (
            data.email && (
              <a
                href={`mailto:${data.email}`}
                className="nodrag flex min-w-0 items-center gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <Mail className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{data.email}</span>
              </a>
            )
          )}
          {links.length > 0 && (
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {links.map((l) => (
                <a
                  key={l.id || l.url}
                  href={toHref(l.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="nodrag flex min-w-0 items-center gap-1 text-muted-foreground hover:text-foreground"
                >
                  <LinkIcon className="h-3 w-3 shrink-0" />
                  <span className="truncate">{l.label || l.url.replace(/^https?:\/\//, "")}</span>
                </a>
              ))}
            </div>
          )}
        </div>

        {selected && !data.name && (
          <button
            type="button"
            onClick={() => applyCurrentUser(update)}
            className="nodrag mt-auto self-start rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            Use me
          </button>
        )}
      </div>
    </NodeShell>
  );
}

export default memo(PersonNode);
