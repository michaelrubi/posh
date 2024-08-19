<script lang="ts">
  import { userData, type UserData } from "$lib/supabaseClient.svelte";
  import "$lib/styles.css";
  
  const users = $derived(userData.getUsers);
  let editingUser: UserData | null = $state(null);
  let error = $state<string | null>(null);
  let addingUser = $state(false);
  // biome-ignore lint/style/useConst: <explanation>
  let searchTerm = $state('');
  // biome-ignore lint/style/useConst: <explanation>
  let usernameInput: HTMLInputElement | null = $state(null);
  // biome-ignore lint/style/useConst: <explanation>
  let addButton: HTMLButtonElement | null = $state(null);
  
  $effect(() => {
    userData.setSearchTerm(searchTerm);
    if (addingUser && usernameInput) {
      usernameInput.focus();
    }
  });

  function getDate() {
    return new Date().toISOString().split("T")[0];
  }
  
  function addUser() {
    addingUser = !addingUser;
    editingUser = {
      username: "",
      name: "",
      firstPurchase: getDate(),
      lastPurchase: getDate(),
      interests: "",
      notes: "",
    } as UserData;
  }
  
  function startEditing(user: UserData) {
    editingUser = { ...user };
    addingUser = false;
  }
  
  async function saveUser() {
    if (!editingUser || !editingUser.username || !editingUser.name) {
        error = "Username and name are required.";
        return;
    }
    try {
        if (addingUser) {
            await userData.addUser(editingUser);
            addingUser = false;
            if (addButton) {
              addButton.focus();
            }
        } else {
            await userData.updateUser(editingUser);
        }
        editingUser = null;
        error = null;
    } catch (err) {
        console.error("Error saving user:", err);
        if (err instanceof Error && err.message === 'Username already exists') {
            error = "This username is already taken. Please choose a different one.";
        } else {
            error = addingUser ? "Failed to add user. Please try again." : "Failed to save user. Please try again.";
        }
    }
}
  
  async function deleteUser(user: UserData) {
    try {
      await userData.deleteUser(user);
      if (editingUser && editingUser.id === user.id) {
        editingUser = null;
      }
      error = null;
    } catch (err) {
      console.error("Error deleting user:", err);
      error = "Failed to delete user. Please try again.";
    }
  }
  
  function cancelEdit() {
    editingUser = null;
    addingUser = false;
    error = null;
  }

  function refreshDate() {
    if (editingUser) {
      editingUser = { ...editingUser, lastPurchase: getDate() };
    }
  }

  function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    event.preventDefault();
    saveUser();
  }
  if (event.key === 'Escape') {
    event.preventDefault();
    cancelEdit();
  }
}
</script>

<h1>Posh Buyers</h1>

{#if userData.isLoading}
  <p>Loading...</p>
{:else}
  <div class="controls">
    <button bind:this={addButton} onclick={addUser}>{addingUser ? "Cancel" : "Add User"}</button>
    <input 
      type="text" 
      bind:value={searchTerm} 
      placeholder="Search by username or name"
    />
  </div>
  
  {#if error}
    <div class="error">{error}</div>
  {/if}
  
  <div class="grid">
    <div class="header">
      <span class="actions">Actions</span>
      <span>Username</span>
      <span>Name</span>
      <span>Interests</span>
      <span>Notes</span>
      <!-- <span>First Purchase</span> -->
      <!-- <span>Last Purchase</span> -->
    </div>
    
    {#if addingUser && editingUser}
      <div class="row editing">
        <div class="actions">
          <button class="action-button" onclick={saveUser}>💾</button>
          <button class="action-button" onclick={cancelEdit}>❌</button>
        </div>
        <input bind:this={usernameInput} bind:value={editingUser.username} placeholder="Username" onkeydown={handleKeydown}/>
        <input bind:value={editingUser.name} placeholder="Name" onkeydown={handleKeydown}/>
        <input bind:value={editingUser.interests} placeholder="Interests" onkeydown={handleKeydown}/>
        <input bind:value={editingUser.notes} placeholder="Notes" onkeydown={handleKeydown}/>
        <!-- <span>{editingUser.firstPurchase}</span> -->
        <!-- <span>{editingUser.lastPurchase}</span> -->
      </div>
    {/if}
    
    {#each users as user (user.id)}
      {#if editingUser && editingUser.id === user.id}
        <div class="row editing">
          <div class="actions">
            <button class="action-button" onclick={saveUser}>💾</button>
            <button class="action-button"  onclick={cancelEdit}>❌</button>
          </div>
          <input bind:value={editingUser.username} placeholder="Username" onkeydown={handleKeydown}/>
          <input bind:value={editingUser.name} placeholder="Name" onkeydown={handleKeydown}/>
          <input bind:value={editingUser.interests} placeholder="Interests" onkeydown={handleKeydown}/>
          <input bind:value={editingUser.notes} placeholder="Notes" onkeydown={handleKeydown}/>
          <!-- <span>{editingUser.firstPurchase}</span> -->
          <!-- <span>{editingUser.lastPurchase}<button class="action-button" onclick={refreshDate}>📅</button></span> -->
        </div>
      {:else}
        <div class="row">
          <div class="actions">
            <button class="action-button" onclick={() => startEditing(user)}>✏️</button>
            <button class="action-button" onclick={() => deleteUser(user)}>🗑️</button>
          </div>
          <span>{user.username}</span>
          <span>{user.name}</span>
          <span>{user.interests}</span>
          <span>{user.notes}</span>
          <!-- <span>{user.firstPurchase}</span> -->
          <!-- <span>{user.lastPurchase}</span> -->
        </div>
      {/if}
    {/each}
  </div>
{/if}