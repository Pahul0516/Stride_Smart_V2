import bcrypt
import psycopg2

class AccountRepo:
    def __init__(self,host,dbname,user,password):
        try:
            self.__connection = psycopg2.connect(
            host = host,
            dbname = dbname,
            user = user,
            password = password
            )
            print('connected successfully to db')
        except Exception as e: 
            print(f"Exception: {e}") 
        
    def get_connection(self):
        return self.__connection
    
    def setAccountId(self,account):
        try:
            cursor = self.__connection.cursor()
            query = "SELECT account_id FROM accounts WHERE email = %s"
            cursor.execute(query, (account.getEmail()))
            result = cursor.fetchone()
            print('id: ',result[0])
            account.setId(result[0])
            self.__connection.commit()
            cursor.close()
        
        except Exception as e:
            print(f'Exception: {e}')

    def addAccount(self,account):
        try:
            cursor = self.__connection.cursor()
            query = "INSERT INTO accounts (username, email, pass,account_type) VALUES (%s, %s, %s, %s)"
            cursor.execute(query, (account.getUserName(), account.getEmail(), account.getPassword(), account.getType()))
            self.__connection.commit()
            cursor.close()
            self.setAccountId(account)
        
        except Exception as e:
            print(f'Exception: {e}')
        
    def findAccount(self,email):
        try:
            cursor = self.__connection.cursor()
            query = "SELECT * FROM accounts WHERE email = %s"
            cursor.execute(query, (email,))
            result = cursor.fetchone()
            print('account: ',result)
            return result

        except Exception as e:
            print(f"Error checking email: {e}")
            return None

    def findAccountName(self,id):
        try:
            cursor = self.__connection.cursor()
            query = "SELECT username FROM accounts WHERE user_id = %s"
            cursor.execute(query, (id,))
            result = cursor.fetchone()
            return result
        except Exception as e:
            print(f"No account with this id: {e}")
            return None

    def verifyPassword(self,email,password):
        try:
            cursor = self.__connection.cursor()
            query = "SELECT pass FROM accounts WHERE email = %s"
            cursor.execute(query, (email,))
            result = cursor.fetchone()
            print('result: ')
            print(result[0])
            if bcrypt.checkpw(password.encode("utf-8"), result[0].encode("utf-8")):
                return True  
            return False  

        except Exception as e:
            # Handle any database errors
            print(f"Incorret password: {e}")
            return False  # Return False if error occurs
    
    def getScore(self,email):
        try:
            cursor = self.__connection.cursor()
            query = "SELECT points FROM accounts WHERE email = %s"
            cursor.execute(query, (email,))
            result = cursor.fetchone()
            print('score: ',result)
            return result

        except Exception as e:
            print(f"Error getting score: {e}")
            return None  
        