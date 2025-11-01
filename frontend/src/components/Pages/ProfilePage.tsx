import { FormEvent, useEffect, useState } from "react";
import { motion } from "motion/react";
import { Camera, X, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/useToast";
import { apiChangePassword, apiMe, apiUpdateProfile, type ApiError } from "@/lib/api";
import { getUser } from "@/lib/auth";

interface ProfilePageProps {
  onLogout: () => void;
  isDark: boolean;
}

export function ProfilePage({ onLogout }: ProfilePageProps) {
  const { success, error, info } = useToast();
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", email: "" });
  const [initialProfile, setInitialProfile] = useState({ name: "", email: "" });
  const [emailVerified, setEmailVerified] = useState<boolean>(true);
  const [passwordForm, setPasswordForm] = useState({ current: "", next: "", confirm: "" });

  useEffect(() => {
    const cached = getUser();
    if (cached) {
      const base = { name: cached.name ?? "", email: cached.email };
      setProfileForm(base);
      setInitialProfile(base);
      setEmailVerified(cached.email_verified ?? true);
      setLoading(false);
    }

    let active = true;
    (async () => {
      try {
        const fresh = await apiMe();
        if (!active) return;
        const next = { name: fresh.name ?? "", email: fresh.email };
        setProfileForm(next);
        setInitialProfile(next);
        setEmailVerified(fresh.email_verified ?? true);
      } catch (err) {
        const apiErr = err as ApiError;
        if (apiErr?.status === 401) {
          error("Your session expired. Please sign in again.");
          onLogout();
        } else if (active) {
          error(apiErr?.message || "Failed to load your profile.");
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [error, onLogout]);

  const trimmedName = profileForm.name.trim();
  const trimmedEmail = profileForm.email.trim();
  const profileChanged =
    trimmedName !== initialProfile.name.trim() || trimmedEmail !== initialProfile.email.trim();

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (savingProfile || loading) return;

    const payload: { name?: string | null; email?: string } = {};
    if (trimmedName !== initialProfile.name.trim()) {
      payload.name = trimmedName === "" ? null : trimmedName;
    }
    if (trimmedEmail !== initialProfile.email.trim()) {
      if (!trimmedEmail) {
        error("Email is required.");
        return;
      }
      payload.email = trimmedEmail;
    }

    if (!Object.keys(payload).length) {
      info("Nothing to update – your profile is already current.");
      return;
    }

    setSavingProfile(true);
    try {
      const updated = await apiUpdateProfile(payload);
      const next = { name: updated.name ?? "", email: updated.email };
      setProfileForm(next);
      setInitialProfile(next);
      setEmailVerified(updated.email_verified ?? true);
      success("Profile updated successfully.");
      if (payload.email && !(updated.email_verified ?? true)) {
        info("We marked your new email as unverified. Please complete the verification process.");
      }
    } catch (err) {
      const apiErr = err as ApiError;
      error(apiErr?.message || "Unable to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (changingPassword) return;

    if (!passwordForm.current || !passwordForm.next || !passwordForm.confirm) {
      error("All password fields are required.");
      return;
    }
    if (passwordForm.next.length < 8) {
      error("New password must be at least 8 characters long.");
      return;
    }
    if (passwordForm.next !== passwordForm.confirm) {
      error("New password and confirmation do not match.");
      return;
    }

    setChangingPassword(true);
    try {
      const response = await apiChangePassword({
        current_password: passwordForm.current,
        new_password: passwordForm.next,
      });
      success(response?.detail || "Password updated successfully.");
      setPasswordForm({ current: "", next: "", confirm: "" });
    } catch (err) {
      const apiErr = err as ApiError;
      error(apiErr?.message || "Unable to change password.");
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      <main className="container mx-auto px-6 py-8 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Back button removed as requested */}

          <div className="flex flex-col items-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center"
            >
              <div className="w-32 h-32 rounded-full bg-gray-100 dark:bg-zinc-800 border-4 border-white dark:border-zinc-700 flex items-center justify-center mb-6 shadow-lg">
                <User className="w-16 h-16 text-gray-400 dark:text-zinc-500" />
              </div>

              <div className="flex items-center gap-3 mb-3">
                <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl px-6">
                  <Camera className="w-4 h-4 mr-2" />
                  Change Photo
                </Button>
                <Button
                  variant="ghost"
                  className="text-gray-700 border-2 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-xl"
                >
                  <X className="w-4 h-4 mr-2" />
                  Remove Photo
                </Button>
              </div>

              <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                We accept JPG, PNG, and GIF images up to 5MB.
              </p>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Card className="p-8 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-[#1A1A1A]">
              <h2 className="text-xl mb-6 text-gray-900 dark:text-white">User Information</h2>

              <form className="space-y-6" onSubmit={handleProfileSubmit}>
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Full Name
                  </label>
                  <Input
                    value={profileForm.name}
                    onChange={(event) =>
                      setProfileForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                    disabled={savingProfile || loading}
                    placeholder="Your name"
                    className="bg-gray-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white rounded-xl disabled:opacity-70"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Email
                  </label>
                  <Input
                    value={profileForm.email}
                    onChange={(event) =>
                      setProfileForm((prev) => ({ ...prev, email: event.target.value }))
                    }
                    disabled={savingProfile || loading}
                    type="email"
                    placeholder="your@email.com"
                    className="bg-gray-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white rounded-xl disabled:opacity-70"
                  />
                  {!emailVerified && (
                    <p className="mt-2 text-sm text-amber-500">
                      Your email is pending verification. Please check your inbox for the verification
                      link.
                    </p>
                  )}
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    disabled={!profileChanged || savingProfile}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl px-6 disabled:opacity-70"
                  >
                    {savingProfile ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
          >
            <Card className="p-8 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-[#1A1A1A]">
              <h2 className="text-xl mb-6 text-gray-900 dark:text-white">Change Password</h2>
              <form className="space-y-6" onSubmit={handlePasswordSubmit}>
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Current Password
                  </label>
                  <Input
                    value={passwordForm.current}
                    onChange={(event) =>
                      setPasswordForm((prev) => ({ ...prev, current: event.target.value }))
                    }
                    disabled={changingPassword}
                    type="password"
                    placeholder="Enter current password"
                    className="bg-gray-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white rounded-xl disabled:opacity-70"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                    New Password
                  </label>
                  <Input
                    value={passwordForm.next}
                    onChange={(event) =>
                      setPasswordForm((prev) => ({ ...prev, next: event.target.value }))
                    }
                    disabled={changingPassword}
                    type="password"
                    placeholder="At least 8 characters"
                    className="bg-gray-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white rounded-xl disabled:opacity-70"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Confirm New Password
                  </label>
                  <Input
                    value={passwordForm.confirm}
                    onChange={(event) =>
                      setPasswordForm((prev) => ({ ...prev, confirm: event.target.value }))
                    }
                    disabled={changingPassword}
                    type="password"
                    placeholder="Retype new password"
                    className="bg-gray-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white rounded-xl disabled:opacity-70"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    disabled={changingPassword}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl px-6 disabled:opacity-70"
                  >
                    {changingPassword ? "Updating..." : "Update Password"}
                  </Button>
                </div>
              </form>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="flex justify-end pt-4"
          >
            <Button
              onClick={onLogout}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl px-8 py-6 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <LogOut className="w-5 h-5 mr-2" />
              Logout
            </Button>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
