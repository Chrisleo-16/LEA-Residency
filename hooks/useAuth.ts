// import { supabase } from "@/lib/supabase";
// import { useEffect, useState } from "react";

// const useAuth = () => {
//   const [name, setName] = useState('');
//   const [email, setEmail] = useState('');
//   const [password, setPassword] =  useState('');
//   const [role, setRole] = useState('tenant');
//   const [isLogin, setIsLogin] = useState(true);
//   const [isLoading, setIsLoading] = useState(false);
//   const [error, setError] = useState('');
//   const [user, setUser] = useState(null);

//   useState(() => {
//     supabase.auth.getSession().then(({ data: { session } }) => {
//       setIsLoading(false);
//       if (session) {
//         setUser(session.user);
//       }
//     });
//     const { data : {subscription} } = supabase.auth.onAuthStateChange((event, session) => {
//       if (event === 'SIGNED_IN') {
//         setUser(session.user);
//       } else if (event === 'SIGNED_OUT') {
//         setUser(null);
//       }
//     })
//     return () => subscription.unsubscribe();

//   },[]);
//   const handleLogin = async () =>{
//     setError('');
//     setIsLoading(true);

//     try {
//       const { data, error } = await supabase.auth.signInWithPassword({
//         email,
//         password,
//       });
//       if (error) throw error;
//       if(data) {
//         setUser(data.user);
//       }
//     } catch (error) {
//       setError('Invalid email or password');
//     } finally {
//       setIsLoading(false);
//     }
//   }

//   const handleSignup = async () => {
//     setError('');
//     setIsLoading(true); 
    
//     const { data, error } = await supabase.auth.signUp({
//       email:email,
//       password:password,
//       options:{
//         data:{
//           full_name:name,
//           role:role
//         }
//       }
//     });

//     if (error) {
//       setError(error.message);
//     } else {
//       setUser(data.user);
//     }

//   }
//   const handleLogout = async () => {
//     await supabase.auth.signOut();
//     setUser(null);
//   }
//   return { user, isLoading, handleLogin, handleLogout, handleSignup };
// }
