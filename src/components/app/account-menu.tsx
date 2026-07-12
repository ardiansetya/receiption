"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SignOut, UserPlus, UserSwitch } from "@phosphor-icons/react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient, useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type DeviceSession = {
  session: { token: string };
  user: { id: string; name: string; email: string };
};

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function AccountMenu({
  user,
  className,
}: {
  user: { name: string; email: string };
  className?: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const currentToken = session?.session.token;

  const { data: deviceSessions } = useQuery({
    queryKey: ["device-sessions"],
    queryFn: async () => {
      const { data, error } = await authClient.multiSession.listDeviceSessions();
      if (error) throw new Error("Gagal memuat daftar akun");
      return data as DeviceSession[];
    },
    staleTime: 60_000,
  });

  const otherSessions = (deviceSessions ?? []).filter(
    (s) => s.session.token !== currentToken
  );

  const afterAccountChange = () => {
    queryClient.clear();
    router.refresh();
  };

  const switchMutation = useMutation({
    mutationFn: async (sessionToken: string) => {
      const { error } = await authClient.multiSession.setActive({
        sessionToken,
      });
      if (error) throw new Error("Gagal ganti akun");
    },
    onSuccess: () => {
      toast.success("Akun diganti.");
      afterAccountChange();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      if (currentToken) {
        await authClient.multiSession.revoke({ sessionToken: currentToken });
      }
      const remaining = otherSessions[0];
      if (remaining) {
        await authClient.multiSession.setActive({
          sessionToken: remaining.session.token,
        });
        return "switched" as const;
      }
      return "loggedOut" as const;
    },
    onSuccess: (result) => {
      if (result === "switched") {
        toast.success("Keluar. Beralih ke akun lain.");
        afterAccountChange();
      } else {
        queryClient.clear();
        router.push("/login");
      }
    },
    onError: () => toast.error("Gagal keluar."),
  });

  const logoutAllMutation = useMutation({
    mutationFn: async () => {
      await authClient.signOut();
    },
    onSuccess: () => {
      queryClient.clear();
      router.push("/login");
    },
    onError: () => toast.error("Gagal keluar."),
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          className
        )}
        aria-label="Menu akun"
      >
        <Avatar className="size-8 border border-border/60">
          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
            {initials(user.name)}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs font-normal text-muted-foreground">
              {user.email}
            </p>
          </DropdownMenuLabel>
        </DropdownMenuGroup>

        {otherSessions.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Ganti akun
              </DropdownMenuLabel>
              {otherSessions.map((s) => (
                <DropdownMenuItem
                  key={s.session.token}
                  disabled={switchMutation.isPending}
                  onClick={() => switchMutation.mutate(s.session.token)}
                >
                  <UserSwitch size={16} />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm">{s.user.name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {s.user.email}
                    </span>
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/login")}>
          <UserPlus size={16} />
          Tambah Akun
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={logoutMutation.isPending}
          onClick={() => logoutMutation.mutate()}
        >
          <SignOut size={16} />
          Keluar
        </DropdownMenuItem>
        {otherSessions.length > 0 && (
          <DropdownMenuItem
            disabled={logoutAllMutation.isPending}
            onClick={() => logoutAllMutation.mutate()}
            className="text-destructive"
          >
            <SignOut size={16} />
            Keluar Semua Akun
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
