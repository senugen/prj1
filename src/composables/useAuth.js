import { ref } from 'vue';
import { membersApi } from '../utils/api';

const currentUser = ref(null);
const isLoading = ref(true);

// 初始化嘗試從 localStorage 還原登入狀態
try {
  const storedUser = localStorage.getItem('gas_user');
  if (storedUser) {
    currentUser.value = JSON.parse(storedUser);
  }
} catch(e) {}
isLoading.value = false;

export function useAuth() {
  
  // 信箱密碼註冊 (寫入 GAS)
  const register = async (email, password, name, phone) => {
    try {
      const user = await membersApi.register({ email, password, name, phone });
      currentUser.value = user;
      localStorage.setItem('gas_user', JSON.stringify(user));
      return user;
    } catch (error) {
      console.error("註冊失敗:", error.message);
      throw error;
    }
  };

  // 信箱密碼登入 (查詢 GAS)
  const login = async (email, password) => {
    try {
      const user = await membersApi.login({ email, password });
      currentUser.value = user;
      localStorage.setItem('gas_user', JSON.stringify(user));
      return user;
    } catch (error) {
      console.error("登入失敗:", error.message);
      throw error;
    }
  };

  // 登出 (清除 LocalStorage)
  const logout = () => {
    currentUser.value = null;
    localStorage.removeItem('gas_user');
  };

  return {
    currentUser,
    isLoading,
    register,
    login,
    logout
  };
}
