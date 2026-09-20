import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signupSchema } from '@raksha/shared';
import { apiFetch, ApiError } from '../../lib/api.js';
import { useAuthStore } from '../../stores/authStore.js';
import { Shield, AlertCircle } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

export const SignupPage: React.FC = () => {
  const [serverError, setServerError] = useState<string | null>(null);
  const [minorWarning, setMinorWarning] = useState(false);
  const { setUser } = useAuthStore();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      username: '',
      password: '',
      displayName: '',
      ageConfirmed18: false as any,
      consents: {
        terms_privacy: false as any,
      },
    },
  });

  const ageChecked = watch('ageConfirmed18');

  const onSubmit = async (data: any) => {
    setServerError(null);
    setMinorWarning(false);

    if (!data.ageConfirmed18) {
      setMinorWarning(true);
      return;
    }

    try {
      const res = await apiFetch<any>('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      setUser(res.user);
      navigate('/onboarding');
    } catch (err: any) {
      if (err instanceof ApiError) {
        setServerError(err.message);
      } else {
        setServerError('Failed to create account. Please try again.');
      }
    }
  };

  return (
    <>
      <Helmet>
        <title>Create Account — Raksha</title>
        <meta name="description" content="Sign up for Raksha Smart Safe Route & Emergency Assistance." />
      </Helmet>

      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-surface border border-border rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center mx-auto shadow-sm">
              <Shield className="w-6 h-6" />
            </div>
            <div className="text-center overflow-x-auto select-none py-1">
              <pre className="font-mono text-[12px] leading-tight text-[#B727F5] inline-block text-left opacity-90">
{` ____     _    _  ______  _   _    _    
|  _ \\   / \\  | |/ / ___|| | | |  / \\   
| |_) | / _ \\ | ' /\\___ \\| |_| | / _ \\  
|  _ < / ___ \\| . \\ ___) |  _  |/ ___ \\ 
|_| \\_/_/   \\_\\_|\\_\\____/|_| |_/_/   \\_\\`}
              </pre>
            </div>
            <h1 className="font-heading font-bold text-2xl text-text">Create your Raksha Account</h1>
            <p className="text-xs text-text-muted">
              Privacy by design: No email required. Pseudonyms are welcome.
            </p>
          </div>

          {serverError && (
            <div role="alert" className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-emergency text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          {minorWarning && (
            <div role="alert" className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-caution text-xs rounded-lg space-y-1">
              <p className="font-semibold">Age Requirement</p>
              <p>
                Raksha is currently designed for adults 18+. If you are in danger, please call <strong>112</strong> immediately. For children’s helpline assistance, dial <strong>1098</strong>.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label htmlFor="displayName" className="block text-xs font-semibold text-text mb-1">
                Display Name (Nickname / Initial)
              </label>
              <input
                id="displayName"
                type="text"
                placeholder="e.g. Priya"
                {...register('displayName')}
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input-bg text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {errors.displayName && (
                <p className="mt-1 text-xs text-emergency">{errors.displayName.message as string}</p>
              )}
            </div>

            <div>
              <label htmlFor="username" className="block text-xs font-semibold text-text mb-1">
                Username
              </label>
              <input
                id="username"
                type="text"
                placeholder="e.g. priyasharma"
                autoComplete="username"
                {...register('username')}
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input-bg text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {errors.username && (
                <p className="mt-1 text-xs text-emergency">{errors.username.message as string}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-text mb-1">
                Password (min 6 characters)
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                {...register('password')}
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input-bg text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {errors.password && (
                <p className="mt-1 text-xs text-emergency">{errors.password.message as string}</p>
              )}
            </div>

            {/* Unbundled Consents (§7.5 - Nothing pre-ticked) */}
            <div className="pt-2 border-t border-border space-y-3">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('ageConfirmed18')}
                  className="mt-1 w-4 h-4 rounded border-border accent-primary cursor-pointer"
                />
                <span className="text-xs text-text leading-tight">
                  I confirm that I am <strong>18 years of age or older</strong>.
                </span>
              </label>
              {errors.ageConfirmed18 && (
                <p className="text-xs text-emergency">{errors.ageConfirmed18.message as string}</p>
              )}

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('consents.terms_privacy')}
                  className="mt-1 w-4 h-4 rounded border-border accent-primary cursor-pointer"
                />
                <span className="text-xs text-text-muted leading-tight">
                  I agree to the{' '}
                  <Link to="/legal/terms" target="_blank" className="text-primary underline">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link to="/legal/privacy" target="_blank" className="text-primary underline">
                    Privacy Policy
                  </Link>
                  .
                </span>
              </label>
              {errors.consents?.terms_privacy && (
                <p className="text-xs text-emergency">
                  {errors.consents.terms_privacy.message as string}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold rounded-xl text-sm shadow-md transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Creating Account...' : 'Continue to Setup'}
            </button>
          </form>

          <p className="text-center text-xs text-text-muted">
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-semibold hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </>
  );
};
