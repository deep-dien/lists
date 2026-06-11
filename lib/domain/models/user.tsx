class User {
  id: string;
  email: string;
  name: string | undefined;
  constructor(init: UserModel) {
    this.id = init.id;
    this.email = init.email;
    this.name = init.name;
  }
}

interface UserModel {
  id: string;
  email: string;
  name?: string;
}

export { User };
