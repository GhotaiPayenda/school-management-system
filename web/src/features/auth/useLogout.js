import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout } from './authSlice.js';

export function useLogout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  return async () => {
    await dispatch(logout());
    navigate('/login', { replace: true });
  };
}
