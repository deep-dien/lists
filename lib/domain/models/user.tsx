class User {
  id: string;
  email: string;
  name: string | undefined;
  canModifyDefaults: boolean | undefined;
  constructor(init: UserModel) {
    this.id = init.id;
    this.email = init.email;
    this.name = init.name;
    this.canModifyDefaults = init.canModifyDefaults;
  }
}

interface UserModel {
  id: string;
  email: string;
  name?: string;
  canModifyDefaults?: boolean;
}

export { User };
