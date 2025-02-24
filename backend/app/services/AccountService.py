from app.domain.Account import Account
import bcrypt

class AccountService:
    def __init__(self,accountRepo):
        self.__accountRepo=accountRepo
    
    def hashPassword(self,password):
        newPass = password.encode('utf-8')
        salt = bcrypt.gensalt()
        hashedPassword = bcrypt.hashpw(newPass, salt).decode('utf-8')
        return hashedPassword

    def addAccount(self,userName,email,password,type):
        hashedPassword=self.hashPassword(password)
        if self.__accountRepo.findAccount(email)==True:
            raise Exception('Given email already exists')
        else:
            account=Account(userName,email,hashedPassword,type)
            self.__accountRepo.addAccount(account)

    def login(self,email,password)->bool:
        if self.__accountRepo.findAccount(email)==None:
            raise Exception('No acount with this email found')
        else:
            if self.__accountRepo.verifyPassword(email,password)==True:
                return True
            else:
                raise Exception('Wrong password')
    
    def findAccount(self,email):
        return self.__accountRepo.findAccount(email)
    
    def getScore(self,email):
        return self.__accountRepo.getScore(email)
    