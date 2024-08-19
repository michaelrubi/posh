import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase URL and anonymous key must be provided');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserData = {
    id?: number;
    username: string;
    name: string;
    firstPurchase: string;
    lastPurchase: string;
    interests: string;
    notes: string;
    searchTerms?: string; // New field for search
};

class UserDataStore {
    private users = $state<UserData[]>([]);
    private filteredUsers = $state<UserData[]>([]);
    private loading = $state(true);
    private searchTerm = $state('');

    constructor() {
        this.fetchUsers();
    }

    private async fetchUsers() {
        this.loading = true;
        const { data, error } = await supabase
            .from('poshbuyer')
            .select('*');
       
        if (error) {
            console.error('Error fetching posh buyers:', error);
        } else {
            this.users = this.sortUsers(data as UserData[]);
            this.updateSearchTerms();
        }
        this.loading = false;
    }

    private sortUsers(users: UserData[]): UserData[] {
        return users.sort((a, b) => {
            const dateComparison = new Date(b.lastPurchase).getTime() - new Date(a.lastPurchase).getTime();
            if (dateComparison !== 0) return dateComparison;
            return a.username.localeCompare(b.username);
        });
    }

    private updateSearchTerms() {
        this.users = this.users.map(user => ({
            ...user,
            searchTerms: `${user.username} ${user.name} ${user.interests}`.toLowerCase()
        }));
    }

    setSearchTerm(term: string) {
        this.searchTerm = term.toLowerCase();
        this.filterUsers();
    }

    private filterUsers() {
        if (!this.searchTerm) {
            this.filteredUsers = this.users;
        } else {
            this.filteredUsers = this.users.filter(user => 
                user.searchTerms?.includes(this.searchTerm)
            );
        }
    }

    async addUser(newData: UserData) {
        // Check if username already exists
        const { data: existingUser } = await supabase
            .from('poshbuyer')
            .select('username')
            .eq('username', newData.username)
            .single();

        if (existingUser) {
            throw new Error('Username already exists');
        }

        // If username doesn't exist, proceed with adding the new user
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { searchTerms, ...dataToInsert } = newData;
        const { data, error } = await supabase
            .from('poshbuyer')
            .insert([dataToInsert])
            .select();

        if (error) {
            console.error('Error adding user:', error);
            throw error;
        }

        const addedUser = data[0] as UserData;
        this.users = this.sortUsers([...this.users, addedUser]);
        this.updateSearchTerms();
        this.filterUsers();

        return addedUser;
    }

    async updateUser(updatedData: UserData) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, searchTerms, ...dataToUpdate } = updatedData; // Omit id and searchTerms
        const { data, error } = await supabase
            .from('poshbuyer')
            .update(dataToUpdate)
            .eq('id', id)
            .select();
        if (error) {
            console.error('Error updating user:', error);
            throw error;
        }
        const updatedUser = { ...data[0], searchTerms: `${data[0].username} ${data[0].name} ${data[0].interests}`.toLowerCase() };
        this.users = this.sortUsers(
            this.users.map(user => user.id === updatedUser.id ? updatedUser : user)
        );
        this.filterUsers();
    }

    async deleteUser(user: UserData) {
        const id = user.id;
        const { error } = await supabase
            .from('poshbuyer')
            .delete()
            .eq('id', user.id);
        if (error) {
            console.error('Error deleting user:', error);
            throw error;
        }
        this.users = this.sortUsers(this.users.filter(user => user.id !== id));
        this.filterUsers();
    }

    createSearch() {
        const store = {
            data: this.users,
            filtered: this.filteredUsers,
            search: this.searchTerm
        };

        const handler = () => {
            this.setSearchTerm(store.search);
        };

        return {
            store,
            handler
        };
    }

    get getUsers() {
        return this.filteredUsers;
    }

    get isLoading() {
        return this.loading;
    }
}

export const userData = new UserDataStore();