namespace MusicApp.Domain;

public abstract class ExcecaoDeDominio : Exception
{
    protected ExcecaoDeDominio(string mensagem) : base(mensagem)
    {
    }
}
