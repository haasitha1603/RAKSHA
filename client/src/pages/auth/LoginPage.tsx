import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '@raksha/shared';
import { apiFetch, ApiError } from '../../lib/api.js';
import { useAuthStore } from '../../stores/authStore.js';
import { Shield, AlertCircle } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

export const LoginPage: React.FC = () => {
  const [serverError, setServerError] = useState<string | null>(null);
  const { setUser } = useAuthStore();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const onSubmit = async (data: any) => {
    setServerError(null);

    try {
      const res = await apiFetch<any>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      setUser(res.user);
      navigate('/app');
    } catch (err: any) {
      if (err instanceof ApiError) {
        setServerError(err.message);
      } else {
        setServerError('Invalid username or password.');
      }
    }
  };

  const fillDemoAccount = () => {
    setValue('username', 'demo');
    setValue('password', 'Demo@12345');
  };

  return (
    <>
      <Helmet>
        <title>Log In — Raksha</title>
        <meta name="description" content="Log in to Raksha Safe Route & Emergency Assistance." />
      </Helmet>

      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-surface border border-border rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center mx-auto shadow-sm">
              <Shield className="w-6 h-6" />
            </div>
            <h1 className="font-heading font-bold text-2xl text-text">Welcome Back</h1>
            <p className="text-xs text-text-muted">Sign in to monitor your journeys and emergency contacts.</p>
          </div>

          {serverError && (
            <div role="alert" className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-emergency text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          {/* Demo account quick filler */}
          <div className="p-3 bg-primary-soft/60 border border-primary/20 rounded-xl flex items-center justify-between text-xs">
            <div>
              <span className="font-semibold text-primary block">Hackathon Demo User</span>
              <span className="text-text-muted font-mono">demo / Demo@12345</span>
            </div>
            <button
              type="button"
              onClick={fillDemoAccount}
              className="px-2.5 py-1 bg-primary text-primary-foreground font-semibold rounded hover:bg-primary-hover transition-colors"
            >
              Fill Demo
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-xs font-semibold text-text mb-1">
                Username
              </label>
              <input
                id="username"
                type="text"
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
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                {...register('password')}
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input-bg text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {errors.password && (
                <p className="mt-1 text-xs text-emergency">{errors.password.message as string}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold rounded-xl text-sm shadow-md transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-xs text-text-muted">
            Don't have an account yet?{' '}
            <Link to="/signup" className="text-primary font-semibold hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </>
  );
};
