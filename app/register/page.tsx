"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";

type Role = "university" | "individual" | "manager";
type ParticipantCategory = "個人" | "クラブチーム" | "OB会";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawParam = searchParams.get("type") as Role | null;
  const typeParam = rawParam === "manager" ? null : rawParam;
  const { register: registerUser, isLoading: authLoading } = useAuth();

  const [role, setRole] = useState<Role>(typeParam || "university");
  const [step, setStep] = useState<"role" | "info">(typeParam ? "info" : "role");
  const [teamName, setTeamName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [individualType, setIndividualType] = useState<ParticipantCategory>("個人");
  const [area, setArea] = useState("");
  const [level, setLevel] = useState("中級");
  const [gender, setGender] = useState("男女混合");
  const [memberCount, setMemberCount] = useState("");
  const [lineId, setLineId] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const roleLabel =
    role === "manager"
      ? "管理人"
      : role === "university"
      ? "大学チーム"
      : "個人/クラブチーム";

  const handleRoleSelect = (selectedRole: Role) => {
    setRole(selectedRole);
    setStep("info");
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (!email.includes("@")) {
      setError("有効なメールアドレスを入力してください。");
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("パスワードが一致しません。");
      setIsLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("パスワードは8文字以上で設定してください。");
      setIsLoading(false);
      return;
    }

    if (!teamName.trim()) {
      setError("名前/チーム名を入力してください。");
      setIsLoading(false);
      return;
    }

    try {
      await registerUser({
        email,
        name: teamName,
        role,
        password,
        ...(role === "individual" && {
          individualType,
          area,
          level,
          gender,
          memberCount,
          lineId,
          notes,
        }),
      });

      setTimeout(() => {
        router.push("/");
      }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "登録処理中にエラーが発生しました。");
      setIsLoading(false);
    }
  };

  if (step === "role") {
    return (
      <main className="min-h-screen bg-[#081025] px-4 py-10 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="w-full max-w-2xl space-y-8">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-3 rounded-full bg-[#4D5BFF]/15 px-4 py-2 text-sm font-semibold uppercase tracking-[0.25em] text-[#93c5fd]">
              LaxMatch
            </div>
            <h1 className="text-5xl font-black tracking-[0.15em] text-white">
              新規登録
            </h1>
            <p className="text-base leading-7 text-slate-300 max-w-2xl mx-auto">
              ラクロス練習試合のマッチング体験を始めましょう。あなたの立場を選択してください。
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 max-w-lg mx-auto w-full">
            {[
              {
                role: "university" as Role,
                label: "大学チーム",
                description: "大学ラクロス部として登録し、他大学と練習試合をマッチングできます。",
              },
              {
                role: "individual" as Role,
                label: "個人・クラブチーム",
                description: "個人、クラブチーム、OB会として登録。大学チームとマッチングできます。",
              },
            ].map((item) => (
              <button
                key={item.role}
                onClick={() => handleRoleSelect(item.role)}
                className="rounded-[2rem] border border-slate-700 bg-slate-950/80 p-6 text-left transition hover:border-[#4D5BFF]/50 hover:bg-slate-900/90"
              >
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#93c5fd]">
                  {item.label}
                </p>
                <p className="mt-4 text-sm leading-6 text-slate-300">{item.description}</p>
              </button>
            ))}
          </div>

          <div className="text-center">
            <p className="text-sm text-slate-400">
              すでにアカウントをお持ちですか？
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="text-[#4D5BFF] hover:text-[#60a5fa] transition font-semibold ml-1"
              >
                ログイン
              </button>
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#081025] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <div className="space-y-8">
          <div>
            <button
              type="button"
              onClick={() => setStep("role")}
              className="text-sm text-[#4D5BFF] hover:text-[#60a5fa] transition font-semibold mb-4"
            >
              ← 戻る
            </button>
            <h1 className="text-4xl font-black tracking-[0.15em] text-white">
              {roleLabel}として登録
            </h1>
            <p className="text-base leading-7 text-slate-400 mt-3">
              アカウント情報を入力してください
            </p>
          </div>

          <form onSubmit={handleRegister} className="space-y-6 rounded-[2rem] border border-slate-700/60 bg-slate-950/95 p-8">
            {error && (
              <div className="rounded-[1.5rem] border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-100">
                {error}
              </div>
            )}

            <label className="block text-sm text-slate-300">
              <span className="font-semibold uppercase tracking-[0.15em]">名前 / チーム名</span>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="mt-3 w-full rounded-[1.5rem] border border-slate-700 bg-slate-900 px-4 py-4 text-base text-white outline-none transition focus:border-[#4D5BFF] focus:ring-2 focus:ring-[#4D5BFF]/20"
                placeholder={role === "university" ? "大学名" : "チーム名または名前"}
                disabled={isLoading || authLoading}
              />
            </label>

            <label className="block text-sm text-slate-300">
              <span className="font-semibold uppercase tracking-[0.15em]">メールアドレス</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-3 w-full rounded-[1.5rem] border border-slate-700 bg-slate-900 px-4 py-4 text-base text-white outline-none transition focus:border-[#4D5BFF] focus:ring-2 focus:ring-[#4D5BFF]/20"
                placeholder="example@lacrosse.jp"
                disabled={isLoading || authLoading}
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm text-slate-300">
                <span className="font-semibold uppercase tracking-[0.15em]">パスワード</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-3 w-full rounded-[1.5rem] border border-slate-700 bg-slate-900 px-4 py-4 text-base text-white outline-none transition focus:border-[#4D5BFF] focus:ring-2 focus:ring-[#4D5BFF]/20"
                  placeholder="••••••••"
                  disabled={isLoading || authLoading}
                />
              </label>
              <label className="block text-sm text-slate-300">
                <span className="font-semibold uppercase tracking-[0.15em]">確認</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-3 w-full rounded-[1.5rem] border border-slate-700 bg-slate-900 px-4 py-4 text-base text-white outline-none transition focus:border-[#4D5BFF] focus:ring-2 focus:ring-[#4D5BFF]/20"
                  placeholder="••••••••"
                  disabled={isLoading || authLoading}
                />
              </label>
            </div>

            {role === "individual" && (
              <>
                <label className="block text-sm text-slate-300">
                  <span className="font-semibold uppercase tracking-[0.15em]">種別</span>
                  <select
                    value={individualType}
                    onChange={(e) => setIndividualType(e.target.value as ParticipantCategory)}
                    className="mt-3 w-full rounded-[1.5rem] border border-slate-700 bg-slate-900 px-4 py-4 text-base text-white outline-none transition focus:border-[#4D5BFF] focus:ring-2 focus:ring-[#4D5BFF]/20"
                    disabled={isLoading || authLoading}
                  >
                    <option value="個人">個人</option>
                    <option value="クラブチーム">クラブチーム</option>
                    <option value="OB会">OB会</option>
                  </select>
                </label>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block text-sm text-slate-300">
                    <span className="font-semibold uppercase tracking-[0.15em]">地域</span>
                    <input
                      type="text"
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      className="mt-3 w-full rounded-[1.5rem] border border-slate-700 bg-slate-900 px-4 py-4 text-base text-white outline-none transition focus:border-[#4D5BFF] focus:ring-2 focus:ring-[#4D5BFF]/20"
                      placeholder="例: 関西"
                      disabled={isLoading || authLoading}
                    />
                  </label>
                  <label className="block text-sm text-slate-300">
                    <span className="font-semibold uppercase tracking-[0.15em]">レベル</span>
                    <select
                      value={level}
                      onChange={(e) => setLevel(e.target.value)}
                      className="mt-3 w-full rounded-[1.5rem] border border-slate-700 bg-slate-900 px-4 py-4 text-base text-white outline-none transition focus:border-[#4D5BFF] focus:ring-2 focus:ring-[#4D5BFF]/20"
                      disabled={isLoading || authLoading}
                    >
                      <option>初級</option>
                      <option>中級</option>
                      <option>強豪</option>
                    </select>
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block text-sm text-slate-300">
                    <span className="font-semibold uppercase tracking-[0.15em]">男女</span>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="mt-3 w-full rounded-[1.5rem] border border-slate-700 bg-slate-900 px-4 py-4 text-base text-white outline-none transition focus:border-[#4D5BFF] focus:ring-2 focus:ring-[#4D5BFF]/20"
                      disabled={isLoading || authLoading}
                    >
                      <option>男女混合</option>
                      <option>男子</option>
                      <option>女子</option>
                    </select>
                  </label>
                  <label className="block text-sm text-slate-300">
                    <span className="font-semibold uppercase tracking-[0.15em]">人数</span>
                    <input
                      type="text"
                      value={memberCount}
                      onChange={(e) => setMemberCount(e.target.value)}
                      className="mt-3 w-full rounded-[1.5rem] border border-slate-700 bg-slate-900 px-4 py-4 text-base text-white outline-none transition focus:border-[#4D5BFF] focus:ring-2 focus:ring-[#4D5BFF]/20"
                      placeholder="任意"
                      disabled={isLoading || authLoading}
                    />
                  </label>
                </div>

                <label className="block text-sm text-slate-300">
                  <span className="font-semibold uppercase tracking-[0.15em]">LINE ID</span>
                  <input
                    type="text"
                    value={lineId}
                    onChange={(e) => setLineId(e.target.value)}
                    className="mt-3 w-full rounded-[1.5rem] border border-slate-700 bg-slate-900 px-4 py-4 text-base text-white outline-none transition focus:border-[#4D5BFF] focus:ring-2 focus:ring-[#4D5BFF]/20"
                    placeholder="例: laxmatch_line"
                    disabled={isLoading || authLoading}
                  />
                </label>

                <label className="block text-sm text-slate-300">
                  <span className="font-semibold uppercase tracking-[0.15em]">備考</span>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="mt-3 w-full rounded-[1.5rem] border border-slate-700 bg-slate-900 px-4 py-4 text-base text-white outline-none transition focus:border-[#4D5BFF] focus:ring-2 focus:ring-[#4D5BFF]/20"
                    placeholder="例: 週末のみ参加可能です。"
                    disabled={isLoading || authLoading}
                  />
                </label>
              </>
            )}

            <button
              type="submit"
              disabled={isLoading || authLoading}
              className="w-full rounded-[1.75rem] bg-gradient-to-r from-[#4D5BFF] to-[#60a5fa] px-6 py-4 text-base font-semibold text-white shadow-lg shadow-[#4D5BFF]/25 transition duration-300 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading || authLoading ? "登録中..." : "登録を完了"}
            </button>
          </form>

          <div className="text-center">
            <p className="text-sm text-slate-400">
              すでにアカウントをお持ちですか？
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="text-[#4D5BFF] hover:text-[#60a5fa] transition font-semibold ml-1"
              >
                ログイン
              </button>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
