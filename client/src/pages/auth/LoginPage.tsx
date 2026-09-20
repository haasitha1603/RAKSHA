import React, { useState, useEffect } from 'react';
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
  const [demoMode, setDemoMode] = useState<boolean>(false);
  const { setUser } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    apiFetch<{ demoMode: boolean }>('/api/config')
      .then((cfg) => {
        if (cfg?.demoMode) setDemoMode(true);
      })
      .catch(() => {});
  }, []);

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
        if (err.status === 401) {
          setServerError('Incorrect username or password');
        } else if (err.status === 429) {
          setServerError('Too many attempts, try again in a minute');
        } else {
          setServerError(err.message || 'Incorrect username or password');
        }
      } else {
        setServerError("Can't reach the server");
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
            <div className="text-center overflow-x-auto select-none py-1">
              <pre className="font-mono text-[12px] leading-tight text-[#B727F5] inline-block text-left opacity-90">
{` ____     _    _  ______  _   _    _    
|  _ \\   / \\  | |/ / ___|| | | |  / \\   
| |_) | / _ \\ | ' /\\___ \\| |_| | / _ \\  
|  _ < / ___ \\| . \\ ___) |  _  |/ ___ \\ 
|_| \\_/_/   \\_\\_|\\_\\____/|_| |_/_/   \\_\\`}
              </pre>
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

          {demoMode && (
            <div className="p-3 bg-primary-soft/60 border border-primary/20 rounded-xl flex items-center justify-between text-xs">
              <div>
                <span className="font-semibold text-primary block">Test Account</span>
                <span className="text-text-muted font-mono">demo / Demo@12345</span>
              </div>
              <button
                type="button"
                onClick={fillDemoAccount}
                className="px-2.5 py-1 bg-primary text-primary-foreground font-semibold rounded hover:bg-primary-hover transition-colors"
              >
                Fill Credentials
              </button>
            </div>
          )}

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
              className="w-full py-3 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold rounded-xl text-sm shadow-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting && (
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
              )}
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
