import React, { createContext, useContext, useState, useEffect } from 'react';
import { IUser, ITeam, TeamRole } from '@teambrain/shared';
import { apiRequest } from '../api/client';
import { getSocket, disconnectSocket } from '../socket/socketClient';

interface AuthContextType {
  user: IUser | null;
  token: string | null;
  currentTeam: ITeam | null;
  currentRole: TeamRole | null;
  memberships: Array<{ team: ITeam; role: TeamRole }>;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: {
    name: string;
    email: string;
    password: string;
    teamName?: string;
    inviteCode?: string;
  }) => Promise<void>;
  logout: () => void;
  selectTeam: (team: ITeam) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<IUser | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('teambrain_token'));
  const [currentTeam, setCurrentTeam] = useState<ITeam | null>(null);
  const [memberships, setMemberships] = useState<Array<{ team: ITeam; role: TeamRole }>>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const currentRole =
    currentTeam && memberships.find((m) => m.team.id === currentTeam.id)?.role || null;

  const refreshUser = async () => {
    if (!token) {
      setUser(null);
      setCurrentTeam(null);
      setMemberships([]);
      setIsLoading(false);
      return;
    }

    try {
      const data = await apiRequest<{
        user: IUser;
        teams: Array<{ team: ITeam; role: TeamRole }>;
      }>('/auth/me');

      setUser(data.user);
      setMemberships(data.teams);

      // Restore or default current team
      if (data.teams.length > 0) {
        const savedTeamId = localStorage.getItem('teambrain_team_id');
        const match = data.teams.find((m) => m.team.id === savedTeamId);
        if (match) {
          setCurrentTeam(match.team);
        } else {
          const firstTeam = data.teams[0]?.team ?? null;
          setCurrentTeam(firstTeam);
          if (firstTeam) localStorage.setItem('teambrain_team_id', firstTeam.id);
        }
      }
    } catch (err) {
      console.warn('Failed to refresh user session:', err);
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, [token]);

  // Connect socket and join team room when team changes
  useEffect(() => {
    if (token && currentTeam) {
      const socket = getSocket();
      socket.emit('team:join', currentTeam.id);
    }
  }, [token, currentTeam]);

  const login = async (email: string, password: string) => {
    const data = await apiRequest<{
      token: string;
      user: IUser;
      memberships: Array<{ team: ITeam; role: TeamRole }>;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    localStorage.setItem('teambrain_token', data.token);
    setToken(data.token);
    setUser(data.user);
    setMemberships(data.memberships);

    if (data.memberships.length > 0) {
      const firstTeam = data.memberships[0]?.team ?? null;
      setCurrentTeam(firstTeam);
      if (firstTeam) localStorage.setItem('teambrain_team_id', firstTeam.id);
    }
  };

  const register = async (payload: {
    name: string;
    email: string;
    password: string;
    teamName?: string;
    inviteCode?: string;
  }) => {
    const data = await apiRequest<{
      token: string;
      user: IUser;
      team: ITeam | null;
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    localStorage.setItem('teambrain_token', data.token);
    setToken(data.token);
    setUser(data.user);
    if (data.team) {
      setCurrentTeam(data.team);
      localStorage.setItem('teambrain_team_id', data.team.id);
      setMemberships([{ team: data.team, role: 'owner' }]);
    }
  };

  const logout = () => {
    localStorage.removeItem('teambrain_token');
    localStorage.removeItem('teambrain_team_id');
    setToken(null);
    setUser(null);
    setCurrentTeam(null);
    setMemberships([]);
    disconnectSocket();
  };

  const selectTeam = (team: ITeam) => {
    setCurrentTeam(team);
    localStorage.setItem('teambrain_team_id', team.id);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        currentTeam,
        currentRole,
        memberships,
        isLoading,
        login,
        register,
        logout,
        selectTeam,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
